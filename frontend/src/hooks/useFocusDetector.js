import { useEffect, useRef, useState, useCallback } from 'react'

// ─── Real browser-side EAR + blink detection using landmark geometry ──────────
// Uses MediaPipe face landmarks loaded via CDN (no npm install needed).
// Falls back to simulation if camera/MediaPipe unavailable.

// EAR (Eye Aspect Ratio) landmark indices for MediaPipe FaceMesh
// For each eye: [outer, top1, top2, inner, bot2, bot1]
const LEFT_EYE_IDX  = [362, 385, 387, 263, 373, 380]
const RIGHT_EYE_IDX = [33,  160, 158, 133, 153, 144]

// Head pose landmarks: nose, chin, left-eye-corner, right-eye-corner, left-mouth, right-mouth
const POSE_IDX = [1, 152, 263, 33, 287, 57]

function calcEAR(landmarks, indices, w, h) {
  const pts = indices.map(i => [landmarks[i].x * w, landmarks[i].y * h])
  const v1 = Math.hypot(pts[1][0]-pts[5][0], pts[1][1]-pts[5][1])
  const v2 = Math.hypot(pts[2][0]-pts[4][0], pts[2][1]-pts[4][1])
  const hz = Math.hypot(pts[0][0]-pts[3][0], pts[0][1]-pts[3][1])
  return (v1 + v2) / (2.0 * hz + 1e-6)
}

function calcHeadYaw(landmarks, w, h) {
  // Simple yaw: horizontal distance between nose tip and face center
  const nose   = landmarks[1]
  const leftEar  = landmarks[234]
  const rightEar = landmarks[454]
  const faceW  = Math.abs(rightEar.x - leftEar.x)
  const nosePct = (nose.x - leftEar.x) / (faceW + 1e-6)
  // nosePct ≈ 0.5 when looking straight; deviation → yaw
  return (nosePct - 0.5) * 90  // degrees approx
}

function calcPitch(landmarks) {
  const nose = landmarks[1]
  const chin = landmarks[152]
  const forehead = landmarks[10]
  const faceH = Math.abs(chin.y - forehead.y)
  const noseY = (nose.y - forehead.y) / (faceH + 1e-6)
  return (noseY - 0.45) * 60  // degrees approx
}

class RealFocusDetector {
  constructor() {
    this.blinkTimes = []
    this.lastEAR = 1.0
    this.blinkThreshold = 0.22
    this.closedFrames = 0
    this.scoreBuffer = []
    this.bufSize = 15
    this.absentCount = 0
  }

  process(landmarks, w, h) {
    const now = Date.now() / 1000
    const earL = calcEAR(landmarks, LEFT_EYE_IDX, w, h)
    const earR = calcEAR(landmarks, RIGHT_EYE_IDX, w, h)
    const ear  = (earL + earR) / 2

    // Blink detection: falling edge
    if (this.lastEAR > this.blinkThreshold && ear <= this.blinkThreshold) {
      this.blinkTimes.push(now)
    }
    this.lastEAR = ear

    // Keep only last 60s
    this.blinkTimes = this.blinkTimes.filter(t => now - t < 60)
    const blinkRate = this.blinkTimes.length * (60 / Math.max(10, Math.min(60, now - (this.blinkTimes[0] || now))))

    // Track closed-eye frames
    if (ear < this.blinkThreshold) this.closedFrames++
    else this.closedFrames = Math.max(0, this.closedFrames - 1)

    const yaw   = calcHeadYaw(landmarks, w, h)
    const pitch = calcPitch(landmarks)

    // ── Scoring ──────────────────────────────────────────────
    let score = 100

    // Head rotation penalty
    const absYaw = Math.abs(yaw)
    if (absYaw > 15) score -= Math.min(45, (absYaw - 15) * 2.2)
    const absPitch = Math.abs(pitch)
    if (absPitch > 12) score -= Math.min(25, (absPitch - 12) * 1.5)

    // Eye closure (sustained = sleepy)
    if (ear < 0.18)       score -= 55   // fully closed
    else if (ear < 0.22)  score -= 30   // drowsy
    else if (ear < 0.26)  score -= 10   // heavy eyes
    if (this.closedFrames > 8) score -= 20  // sustained closure bonus

    // Blink rate anomaly
    if (blinkRate > 28)   score -= 12
    if (blinkRate < 4 && this.blinkTimes.length > 2) score -= 8

    score = Math.max(0, Math.min(100, score))

    // Smooth
    this.scoreBuffer.push(score)
    if (this.scoreBuffer.length > this.bufSize) this.scoreBuffer.shift()
    const smooth = this.scoreBuffer.reduce((a,b)=>a+b,0) / this.scoreBuffer.length

    const state = smooth >= 75 ? 'focused' : smooth >= 50 ? 'distracted' : smooth >= 20 ? 'sleepy' : 'absent'

    this.absentCount = 0
    return {
      score: Math.round(smooth * 10) / 10,
      state,
      features: { ear_left: +earL.toFixed(3), ear_right: +earR.toFixed(3), head_yaw: +yaw.toFixed(1), head_pitch: +pitch.toFixed(1), blink_rate: +blinkRate.toFixed(1), face_visible: true, iris_deviation: 0, mouth_open: 0 },
      confidence: 0.9,
    }
  }

  absent() {
    this.absentCount++
    this.scoreBuffer.push(0)
    if (this.scoreBuffer.length > this.bufSize) this.scoreBuffer.shift()
    const smooth = this.scoreBuffer.reduce((a,b)=>a+b,0) / this.scoreBuffer.length
    return { score: Math.round(smooth*10)/10, state: 'absent', features:{ ear_left:0,ear_right:0,head_yaw:0,head_pitch:0,blink_rate:0,face_visible:false,iris_deviation:0,mouth_open:0 }, confidence:0.9 }
  }
}

// ─── Simulation fallback ──────────────────────────────────────────────────────
function simulate(t, seed) {
  const cycle  = Math.sin(t / 28 + seed) * 0.5 + 0.5
  const micro  = Math.sin(t / 4  + seed * 2) * 0.12
  const base   = 68 + cycle * 22 + micro * 8
  const score  = Math.max(0, Math.min(100, base + (Math.random()-.5)*7))
  const state  = score >= 75 ? 'focused' : score >= 50 ? 'distracted' : 'sleepy'
  return {
    score: Math.round(score*10)/10, state,
    features:{ ear_left:0.29+Math.random()*.04, ear_right:0.28+Math.random()*.04, head_yaw:(Math.random()-.5)*(state==='distracted'?26:8), head_pitch:(Math.random()-.5)*8, blink_rate:14+Math.random()*6, face_visible:true, iris_deviation:.02, mouth_open:.01 },
    confidence:0.5,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useFocusDetector({ onUpdate, interval = 1500 }) {
  const [focusData, setFocusData]     = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [mediapipeReady, setMediapipeReady] = useState(false)

  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const rafRef      = useRef(null)
  const timerRef    = useRef(null)
  const detectorRef = useRef(new RealFocusDetector())
  const faceMeshRef = useRef(null)
  const lastResultRef = useRef(null)
  const seedRef     = useRef(Math.random() * 10)
  const mountedRef  = useRef(true)

  // ── Load MediaPipe FaceMesh from CDN ──────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    let script1, script2

    const load = () => {
      script1 = document.createElement('script')
      script1.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js'
      script1.crossOrigin = 'anonymous'
      script1.onload = () => {
        script2 = document.createElement('script')
        script2.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
        script2.crossOrigin = 'anonymous'
        script2.onload = () => { if (mountedRef.current) setMediapipeReady(true) }
        document.head.appendChild(script2)
      }
      document.head.appendChild(script1)
    }
    load()

    return () => {
      mountedRef.current = false
    }
  }, [])

  // ── Start camera (FIXED: only runs once, cleans up properly) ──────────────
  const startCamera = useCallback(async () => {
    if (streamRef.current) return  // Already running — prevent double start
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      })
      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCameraActive(true)
    } catch (e) {
      setCameraError(e.name === 'NotAllowedError' ? 'Camera permission denied. Please allow camera access.' : e.message)
    }
  }, [])

  // ── Stop camera (FIXED: clears everything) ────────────────────────────────
  const stopCamera = useCallback(() => {
    // Stop MediaPipe camera loop
    if (faceMeshRef.current?._camera) {
      try { faceMeshRef.current._camera.stop() } catch {}
    }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraActive(false)
    setFocusData(null)
    detectorRef.current = new RealFocusDetector()  // Reset detector state
  }, [])

  // ── Detection loop (runs when camera is active) ───────────────────────────
  useEffect(() => {
    if (!cameraActive || !videoRef.current) return

    const video = videoRef.current
    let faceMesh = null
    let localRunning = true

    const runDetection = async () => {
      // Try real MediaPipe if available
      if (mediapipeReady && window.FaceMesh) {
        faceMesh = new window.FaceMesh({
          locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
        })
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
        faceMesh.onResults((results) => {
          if (!localRunning || !mountedRef.current) return
          const lm = results.multiFaceLandmarks?.[0]
          const w = video.videoWidth || 640
          const h = video.videoHeight || 480
          const result = lm
            ? detectorRef.current.process(lm, w, h)
            : detectorRef.current.absent()
          lastResultRef.current = result
        })
        faceMeshRef.current = faceMesh

        // Frame loop
        const loop = async () => {
          if (!localRunning || !mountedRef.current) return
          if (video.readyState >= 2) {
            await faceMesh.send({ image: video }).catch(() => {})
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        loop()
      } else {
        // Simulation loop (no MediaPipe)
        const simLoop = () => {
          if (!localRunning || !mountedRef.current) return
          lastResultRef.current = simulate(Date.now() / 1000, seedRef.current)
          rafRef.current = requestAnimationFrame(() => setTimeout(simLoop, 500))
        }
        simLoop()
      }

      // Push results at interval
      timerRef.current = setInterval(() => {
        if (!localRunning || !mountedRef.current) return
        const result = lastResultRef.current || simulate(Date.now()/1000, seedRef.current)
        setFocusData(result)
        onUpdate?.(result)
      }, interval)
    }

    runDetection()

    return () => {
      localRunning = false
      if (faceMesh) { try { faceMesh.close() } catch {} }
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
  }, [cameraActive, mediapipeReady, interval, onUpdate])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      mountedRef.current = false
      stopCamera()
    }
  }, [stopCamera])

  return { focusData, cameraActive, cameraError, mediapipeReady, videoRef, canvasRef, startCamera, stopCamera }
}
