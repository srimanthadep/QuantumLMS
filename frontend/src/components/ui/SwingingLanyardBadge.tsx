/* eslint-disable */
// Swinging Lanyard Badge — Originkit

// Delivered by Originkit · stack: nextjs
"use client";

const RenderTarget = {
  current: () => "preview",
  hasRestrictions: () => false,
  canvas: "canvas",
  export: "export",
  preview: "preview",
  thumbnail: "thumbnail",
};

// Delivered by Originkit · stack: framer
// Paste into a Framer code component. Property controls included.
import * as React from "react"
import { useEffect, useRef } from "react"

/** Tuning values. Stripped at publish; the tuned values are baked in here. */
const ADVANCED_DEFAULTS = {
    hover: 100,
    grain: 0,
    vignette: 0,
    stretch: 50,
    dragStiffness: 50,
    ropeWeight: 30,
    iterations: 12,
    anchorY: -5,
    strapSpread: 95,
    strapWidth: 14,
    strapSheen: 30,
    clipLength: 82,
    clipColor: "#A6A5AD",
    holderWidth: 62,
    holderColor: "#F7F7F7",
    holderOpacity: 94,
    holderRadius: 9,
    borderColor: "#D0D0D2",
    insertTop: 64,
    insertMargin: 14,
    holeSize: 21,
    gloss: 35,
    shadowColor: "#000000",
    shadowOpacity: 45,
    shadowBlur: 20,
    shadowX: 15,
    shadowY: 20,
}

// ── moved controls (builder) ──
const MOVED_CONTROLS: { into: Record<string, string>; out: Record<string, string> } = {"into":{},"out":{"hover":"advanced"}}
const GROUP_FALLBACKS: Record<string, any> = { advanced: ADVANCED_DEFAULTS }
function withMovedControls(props: any): any {
    const out = { ...props }
    for (const [k, g] of Object.entries(MOVED_CONTROLS.into)) out[k] = props?.[g]?.[k] ?? GROUP_FALLBACKS[g]?.[k]
    for (const [k, g] of Object.entries(MOVED_CONTROLS.out)) {
        if (out[k] !== undefined) out[g] = { ...(out[g] ?? {}), [k]: out[k] }
    }
    return out
}
// ── /moved controls ──

// Segments per strap
const N = 12
// Physics substep (s)
const SUB = 1 / 240
// Slot centre below the holder's top edge, px at size 400
const SLOT_Y = 27
// Most the card can bend against the clip at the slot before the claw meets the slot's ends
const MAX_SLOT_BEND = (32 * Math.PI) / 180
// Narrowest angle between a strap and the clip at the crimp, so the clip can't fold up along a strap
const MIN_CRIMP_ANGLE = (105 * Math.PI) / 180

/** The Card Image control's default, also used when no image prop is passed (outside Framer). */
const DEFAULT_IMAGE = {"src":"https://images.unsplash.com/photo-1637766652059-af65a50715eb?auto=format&fit=crop&w=1200&q=80","alt":"Portrait of a woman against an amber wall"}

type Pt = { x: number; y: number; px: number; py: number; im: number }

function parseColor(c: string): [number, number, number, number] {
    if (!c || typeof c !== "string") return [0, 0, 0, 1]
    const s = c.trim()
    if (s[0] === "#") {
        let h = s.slice(1)
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((x) => x + x)
                .join("")
        const n = parseInt(h.slice(0, 6), 16)
        const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]
    }
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (m) {
        const p = m[1]
            .split(/[\s,/]+/)
            .filter(Boolean)
            .map(parseFloat)
        return [p[0] || 0, p[1] || 0, p[2] || 0, p[3] ?? 1]
    }
    return [0, 0, 0, 1]
}

function rgba(c: string, a = 1) {
    const [r, g, b, al] = parseColor(c)
    return `rgba(${r | 0},${g | 0},${b | 0},${al * a})`
}

function mix(c1: string, c2: string, t: number) {
    const a = parseColor(c1)
    const b = parseColor(c2)
    const k = Math.max(0, Math.min(1, t))
    return `rgba(${(a[0] + (b[0] - a[0]) * k) | 0},${(a[1] + (b[1] - a[1]) * k) | 0},${(a[2] + (b[2] - a[2]) * k) | 0},${a[3] + (b[3] - a[3]) * k})`
}

function imageSrc(v: any): string | undefined {
    if (!v) return undefined
    if (typeof v === "string") return v
    if (typeof v.src === "string" && v.src) return v.src
    return undefined
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const k = Math.max(0, Math.min(r, w / 2, h / 2))
    ctx.beginPath()
    ctx.moveTo(x + k, y)
    ctx.arcTo(x + w, y, x + w, y + h, k)
    ctx.arcTo(x + w, y + h, x, y + h, k)
    ctx.arcTo(x, y + h, x, y, k)
    ctx.arcTo(x, y, x + w, y, k)
    ctx.closePath()
}

/* Pictures load once per page, so a remount draws the badge photo at once instead of a blank card. */
const IMAGE_CACHE = new Map<string, HTMLImageElement>()

function __OriginkitBase_SwingingLanyardBadge(props: any) {
    props = withMovedControls(props)
    const {
        background = "#00000000",
        strapColor = "#ea580c",
        cardColor = "#F2F2F2",
        image = DEFAULT_IMAGE,
        imageOffsetY = 0,
        size = 230,
        ropeLength = 16,
        gravity = 50,
        damping = 50,
        speed = 50,
        style,
    } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const valsRef = useRef<any>(null)
    valsRef.current = {
        background,
        strapColor,
        cardColor,
        image,
        imageOffsetY,
        size,
        ropeLength,
        gravity,
        damping,
        speed,
        advanced: props.advanced,
    }

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const target = RenderTarget.current()
        const isStatic = target === RenderTarget.thumbnail || target === RenderTarget.export
        const reduced =
            typeof window !== "undefined" &&
            !!window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches

        let W = 0
        let H = 0
        let dpr = 1
        let raf = 0
        let last = -1
        let acc = 0
        let ready = false
        let visible = true

        let vx0 = 0
        let vy0 = 0
        let vx1 = 0
        let vy1 = 0
        let clipEl: HTMLElement | null = null
        if (target !== RenderTarget.canvas) {
            const win = root.ownerDocument.defaultView || window
            for (let el = root.parentElement; el && el !== root.ownerDocument.body; el = el.parentElement) {
                const cs = win.getComputedStyle(el)
                if (/hidden|clip/.test(cs.overflowX + cs.overflowY)) {
                    clipEl = el
                    break
                }
            }
        }
        const measureView = () => {
            vx0 = 0
            vy0 = 0
            vx1 = W
            vy1 = H
            if (!clipEl) return
            const r = root.getBoundingClientRect()
            const c = clipEl.getBoundingClientRect()
            const k = r.width / (root.offsetWidth || 1) || 1
            vx0 = Math.max(0, (c.left - r.left) / k)
            vy0 = Math.max(0, (c.top - r.top) / k)
            vx1 = Math.min(W, (c.right - r.left) / k)
            vy1 = Math.min(H, (c.bottom - r.top) / k)
        }

        // Points: left anchor 0, left rope 1..N-1, J = N, right anchor N+1, right rope N+2..2N, P, B
        const iJ = N
        const iRA = N + 1
        const iP = 2 * N + 1
        const iB = 2 * N + 2
        const pts: Pt[] = []
        for (let i = 0; i <= iB; i++) pts.push({ x: 0, y: 0, px: 0, py: 0, im: 1 })
        const leftIdx: number[] = []
        for (let k = 0; k < N; k++) leftIdx.push(k)
        leftIdx.push(iJ)
        const rightIdx: number[] = []
        for (let k = 0; k < N; k++) rightIdx.push(iRA + k)
        rightIdx.push(iJ)

        // Pointer state
        let ptrX = 0
        let ptrY = 0
        let over = 0
        let overTarget = 0
        let userDrag: null | { t: number; lx: number; tx: number; ty: number } = null

        // Images
        const cache = IMAGE_CACHE
        const getImage = (src?: string) => {
            if (!src) return null
            let img = cache.get(src)
            if (!img) {
                img = new Image()
                img.decoding = "async"
                img.src = src
                cache.set(src, img)
            }
            return img.complete && img.naturalWidth > 0 ? img : null
        }

        // Grain tile
        const noise = document.createElement("canvas")
        noise.width = 128
        noise.height = 128
        const nctx = noise.getContext("2d")
        if (nctx) {
            const id = nctx.createImageData(128, 128)
            for (let i = 0; i < id.data.length; i += 4) {
                const v = Math.random() < 0.5 ? 0 : 255
                id.data[i] = v
                id.data[i + 1] = v
                id.data[i + 2] = v
                id.data[i + 3] = Math.random() * 120
            }
            nctx.putImageData(id, 0, 0)
        }
        let grainPattern: CanvasPattern | null = null

        const advOf = (v: any) => ({ ...ADVANCED_DEFAULTS, ...(v.advanced ?? {}) })

        const geom = (v: any, adv: any) => {
            const sz = Math.max(50, v.size)
            const s = sz / 400
            const cx = W / 2
            const ay = (adv.anchorY / 100) * H
            const jy = (v.ropeLength / 100) * H
            const spread = adv.strapSpread * s
            const clipLen = adv.clipLength * s
            const slotY = SLOT_Y * s
            const hH = sz
            const hW = (sz * adv.holderWidth) / 100
            const stick = hH - slotY
            const segL = Math.hypot(spread, jy - ay) / N
            const minJB = Math.sqrt(clipLen * clipLen + stick * stick + 2 * clipLen * stick * Math.cos(MAX_SLOT_BEND))
            const minSP = Math.sqrt(segL * segL + clipLen * clipLen - 2 * segL * clipLen * Math.cos(MIN_CRIMP_ANGLE))
            return { s, cx, ay, jy, spread, clipLen, slotY, hH, hW, stick, segL, minJB, minSP }
        }

        const place = (G: any) => {
            for (let k = 0; k <= N; k++) {
                const t = k / N
                const l = pts[leftIdx[k]]
                l.x = G.cx - G.spread * (1 - t)
                l.y = G.ay + (G.jy - G.ay) * t
                const r = pts[rightIdx[k]]
                r.x = G.cx + G.spread * (1 - t)
                r.y = G.ay + (G.jy - G.ay) * t
            }
            pts[iP].x = G.cx
            pts[iP].y = G.jy + G.clipLen
            pts[iB].x = G.cx
            pts[iB].y = G.jy + G.clipLen + G.stick
            for (const p of pts) {
                p.px = p.x
                p.py = p.y
            }
        }

        const grabPoint = (t: number, lx: number) => {
            const P = pts[iP]
            const B = pts[iB]
            const len = Math.hypot(B.x - P.x, B.y - P.y) || 1
            const ux = (B.x - P.x) / len
            const uy = (B.y - P.y) / len
            return { x: P.x + ux * t * len + uy * lx, y: P.y + uy * t * len - ux * lx }
        }

        const satisfy = (a: Pt, b: Pt, rest: number) => {
            const dx = b.x - a.x
            const dy = b.y - a.y
            const d = Math.hypot(dx, dy) || 1e-6
            const w = a.im + b.im
            if (!w) return
            const diff = (d - rest) / (d * w)
            a.x += dx * diff * a.im
            a.y += dy * diff * a.im
            b.x -= dx * diff * b.im
            b.y -= dy * diff * b.im
        }

        const apart = (a: Pt, b: Pt, minD: number) => {
            const dx = b.x - a.x
            const dy = b.y - a.y
            const d = Math.hypot(dx, dy) || 1e-6
            if (d >= minD) return
            const w = a.im + b.im
            if (!w) return
            const diff = (d - minD) / (d * w)
            a.x += dx * diff * a.im
            a.y += dy * diff * a.im
            b.x -= dx * diff * b.im
            b.y -= dy * diff * b.im
        }

        const soft = (a: Pt, b: Pt, rest: number, k: number) => {
            const dx = b.x - a.x
            const dy = b.y - a.y
            const d = Math.hypot(dx, dy) || 1e-6
            const w = a.im + b.im
            if (!w) return
            const diff = ((d - rest) / (d * w)) * k
            a.x += dx * diff * a.im
            a.y += dy * diff * a.im
            b.x -= dx * diff * b.im
            b.y -= dy * diff * b.im
        }

        const tether = (A: Pt, p: Pt, maxD: number) => {
            const dx = p.x - A.x
            const dy = p.y - A.y
            const d = Math.hypot(dx, dy)
            if (d > maxD && d > 0) {
                p.x = A.x + (dx / d) * maxD
                p.y = A.y + (dy / d) * maxD
            }
        }

        const keepIn = (G: any) => {
            const P = pts[iP]
            const B = pts[iB]
            const pad = G.s + 1
            const hw = G.hW / 2
            const xOk = vx1 - vx0 > G.hW + 2 * pad
            const yOk = vy1 - vy0 > G.hH + 2 * pad
            if (!xOk && !yOk) return
            for (const t of [-G.slotY / G.stick, 1]) {
                for (const side of [-1, 1]) {
                    const len = Math.hypot(B.x - P.x, B.y - P.y) || 1
                    const ux = (B.x - P.x) / len
                    const uy = (B.y - P.y) / len
                    const cx = P.x + ux * t * len + uy * side * hw
                    const cy = P.y + uy * t * len - ux * side * hw
                    let dx = 0
                    let dy = 0
                    if (xOk) dx = Math.max(0, vx0 + pad - cx) + Math.min(0, vx1 - pad - cx)
                    if (yOk) dy = Math.max(0, vy0 + pad - cy) + Math.min(0, vy1 - pad - cy)
                    if (!dx && !dy) continue
                    const den = (1 - t) * (1 - t) + t * t
                    P.x += (dx * (1 - t)) / den
                    P.y += (dy * (1 - t)) / den
                    B.x += (dx * t) / den
                    B.y += (dy * t) / den
                }
            }
        }

        const step = (h: number, v: any, adv: any, G: any, hoverAmt: number, settling: boolean) => {
            const ropeIm = 1 / Math.max(0.02, (adv.ropeWeight / 100) * 0.5)
            for (let i = 0; i < pts.length; i++) pts[i].im = ropeIm
            pts[iP].im = 1
            pts[iB].im = 1
            const LA = pts[0]
            const RA = pts[iRA]
            LA.im = 0
            RA.im = 0
            LA.x = LA.px = G.cx - G.spread
            LA.y = LA.py = G.ay
            RA.x = RA.px = G.cx + G.spread
            RA.y = RA.py = G.ay

            const g = 15 * H * (Math.max(0, v.gravity) / 50)
            const c = settling ? 12 : 2 * (Math.max(0, v.damping) / 50)
            const keep = Math.exp(-c * h)
            const maxStep = H * 0.04
            for (const p of pts) {
                if (p.im === 0) continue
                let vx = (p.x - p.px) * keep
                let vy = (p.y - p.py) * keep
                const sp = Math.hypot(vx, vy)
                if (sp > maxStep) {
                    vx *= maxStep / sp
                    vy *= maxStep / sp
                }
                p.px = p.x
                p.py = p.y
                p.x += vx
                p.y += vy + g * h * h
            }

            const grab = settling ? null : userDrag
            if (!settling && !grab && hoverAmt > 0 && over > 0.001) {
                const B = pts[iB]
                B.x += (ptrX - B.x) * 10 * hoverAmt * over * h * h
            }
            if (grab) {
                const P = pts[iP]
                const B = pts[iB]
                const gp = grabPoint(grab.t, grab.lx)
                const f = 1 - Math.exp(-((adv.dragStiffness / 50) * 20) * h)
                const dX = (grab.tx - gp.x) * f
                const dY = (grab.ty - gp.y) * f
                const t = grab.t
                const den = (1 - t) * (1 - t) + t * t
                P.x += (dX * (1 - t)) / den
                P.y += (dY * (1 - t)) / den
                B.x += (dX * t) / den
                B.y += (dY * t) / den
            }

            const iters = Math.max(1, Math.min(40, Math.round(adv.iterations)))
            const give = Math.max(0, Math.min(1, adv.stretch / 100))
            const kStep = 1 - 0.12 * give
            const kIter = give <= 0 ? 1 : 1 - Math.pow(1 - kStep, 1 / iters)
            const reach = 1 + 0.5 * give
            for (let it = 0; it < iters; it++) {
                for (let k = 0; k < N; k++) {
                    soft(pts[leftIdx[k]], pts[leftIdx[k + 1]], G.segL, kIter)
                    soft(pts[rightIdx[k]], pts[rightIdx[k + 1]], G.segL, kIter)
                }
                satisfy(pts[iJ], pts[iP], G.clipLen)
                satisfy(pts[iP], pts[iB], G.stick)
                for (let k = 1; k <= N; k++) {
                    tether(LA, pts[leftIdx[k]], k * G.segL * reach)
                    tether(RA, pts[rightIdx[k]], k * G.segL * reach)
                }
                satisfy(pts[leftIdx[N - 1]], pts[rightIdx[N - 1]], 0)
                apart(pts[iJ], pts[iB], G.minJB)
                apart(pts[leftIdx[N - 1]], pts[iP], G.minSP)
                apart(pts[rightIdx[N - 1]], pts[iP], G.minSP)
                satisfy(pts[iJ], pts[iP], G.clipLen)
                satisfy(pts[iP], pts[iB], G.stick)
                keepIn(G)
            }
        }

        const settle = () => {
            const v = valsRef.current
            const adv = advOf(v)
            const G = geom(v, adv)
            place(G)
            for (let i = 0; i < 600; i++) step(SUB, v, adv, G, 0, true)
            for (const p of pts) {
                p.px = p.x
                p.py = p.y
            }
        }

        // ── drawing ──
        const SHADOW_OFF = 20000

        const withShadow = (adv: any, s: number, draw: () => void) => {
            ctx.save()
            ctx.shadowColor = rgba(adv.shadowColor, adv.shadowOpacity / 100)
            ctx.shadowBlur = adv.shadowBlur * s * dpr
            ctx.shadowOffsetX = (SHADOW_OFF + adv.shadowX * s) * dpr
            ctx.shadowOffsetY = adv.shadowY * s * dpr
            ctx.translate(-SHADOW_OFF, 0)
            ctx.fillStyle = "#000"
            ctx.strokeStyle = "#000"
            draw()
            ctx.restore()
        }

        const polyline = (list: Pt[]) => {
            ctx.beginPath()
            ctx.moveTo(list[0].x, list[0].y)
            for (let i = 1; i < list.length; i++) ctx.lineTo(list[i].x, list[i].y)
        }

        const angDiff = (a: number, b: number) => {
            let d = a - b
            while (d > Math.PI) d -= Math.PI * 2
            while (d < -Math.PI) d += Math.PI * 2
            return Math.abs(d)
        }

        const smooth = (e: number[][], first: boolean) => {
            if (first) ctx.moveTo(e[0][0], e[0][1])
            else ctx.lineTo(e[0][0], e[0][1])
            for (let i = 1; i < e.length - 1; i++)
                ctx.quadraticCurveTo(e[i][0], e[i][1], (e[i][0] + e[i + 1][0]) / 2, (e[i][1] + e[i + 1][1]) / 2)
            ctx.lineTo(e[e.length - 1][0], e[e.length - 1][1])
        }

        type Strap = { list: Pt[]; L: number[][]; R: number[][]; wf: number[]; fade: number[] }

        const strapEdges = (list: Pt[], base: number, width: number, restSeg: number, sMerge: number, sFull: number): Strap => {
            const n = list.length
            const L: number[][] = []
            const R: number[][] = []
            const wf: number[] = []
            const fade: number[] = []
            const sUp: number[] = new Array(n)
            sUp[n - 1] = 0
            for (let i = n - 2; i >= 0; i--) sUp[i] = sUp[i + 1] + Math.hypot(list[i + 1].x - list[i].x, list[i + 1].y - list[i].y)
            for (let i = 0; i < n; i++) {
                const a = list[Math.max(0, i - 1)]
                const b = list[Math.min(n - 1, i + 1)]
                const tx = b.x - a.x
                const ty = b.y - a.y
                const tl = Math.hypot(tx, ty) || 1
                const ang = Math.atan2(ty, tx)
                const dev = angDiff(ang, base)
                const turn = 0.84 + 0.16 * Math.abs(Math.cos(Math.min(dev * 1.2, Math.PI / 2)))
                const ratio = tl / Math.max(1e-3, restSeg * (i === 0 || i === n - 1 ? 1 : 2))
                const k = Math.max(0, Math.min(1, (sUp[i] - sMerge) / Math.max(1e-3, sFull - sMerge)))
                const fd = k * k * (3 - 2 * k)
                const f = 1 - (1 - turn * Math.max(0.72, Math.min(1, 1 - (ratio - 1) * 1.2))) * fd
                wf.push(f)
                fade.push(fd)
                const nx = -ty / tl
                const ny = tx / tl
                const hw = (width / 2) * f
                L.push([list[i].x + nx * hw, list[i].y + ny * hw])
                R.push([list[i].x - nx * hw, list[i].y - ny * hw])
            }
            return { list, L, R, wf, fade }
        }

        const outline = (st: Strap) => {
            smooth(st.L, true)
            smooth([...st.R].reverse(), false)
            ctx.closePath()
        }

        const alongStrap = (st: Strap, rgb: string, alpha: (i: number) => number) => {
            const list = st.list
            const n = list.length
            const x0 = list[0].x
            const y0 = list[0].y
            const ax = list[n - 1].x - x0
            const ay = list[n - 1].y - y0
            const aa = ax * ax + ay * ay || 1
            const g = ctx.createLinearGradient(x0, y0, x0 + ax, y0 + ay)
            let t = 0
            for (let i = 0; i < n; i++) {
                t = Math.max(t, Math.min(1, ((list[i].x - x0) * ax + (list[i].y - y0) * ay) / aa))
                g.addColorStop(t, `rgba(${rgb},${Math.max(0, alpha(i))})`)
            }
            return g
        }

        const drawStraps = (left: Pt[], right: Pt[], baseL: number, baseR: number, width: number, color: string, sheen: number, restSeg: number) => {
            const n = left.length
            const J = left[n - 1]
            const S = left[n - 2]
            const stem = Math.hypot(S.x - J.x, S.y - J.y)
            const lx = left[n - 3].x - S.x
            const ly = left[n - 3].y - S.y
            const rx = right[n - 3].x - S.x
            const ry = right[n - 3].y - S.y
            const c = (lx * rx + ly * ry) / ((Math.hypot(lx, ly) * Math.hypot(rx, ry)) || 1)
            const half = Math.acos(Math.max(-1, Math.min(1, c))) / 2
            const crotch = stem + Math.min(4 * width, width / 2 / Math.max(0.05, Math.sin(half)))
            const sMerge = crotch + 0.5 * width
            const sFull = sMerge + 2.5 * width
            const A = strapEdges(left, baseL, width, restSeg, sMerge, sFull)
            const B = strapEdges(right, baseR, width, restSeg, sMerge, sFull)

            for (const st of [A, B]) {
                ctx.beginPath()
                outline(st)
                ctx.fillStyle = color
                ctx.fill()
                if (st.wf.some((f) => f < 0.99)) {
                    ctx.beginPath()
                    outline(st)
                    ctx.fillStyle = alongStrap(st, "0,0,0", (i) => Math.min(0.3, (1 - st.wf[i]) * 1.6))
                    ctx.fill()
                }
                if (sheen > 0) {
                    ctx.beginPath()
                    smooth(st.L.map((l, i) => [l[0] + (st.R[i][0] - l[0]) * 0.3, l[1] + (st.R[i][1] - l[1]) * 0.3]), true)
                    ctx.strokeStyle = alongStrap(st, "255,255,255", (i) => sheen * 0.3 * st.fade[i])
                    ctx.lineWidth = width * 0.22
                    ctx.lineJoin = "round"
                    ctx.stroke()
                }
            }
        }

        let tileKey = ""
        let tilePat: CanvasPattern | null = null
        const tileM = new DOMMatrix()
        const insertTile = (img: HTMLImageElement | null, color: string, iw: number, ih: number, offY: number) => {
            const q = 2 * dpr
            const tw = Math.ceil(iw * q) + 2
            const th = Math.ceil(ih * q) + 2
            const off = Math.max(-250, Math.min(250, typeof offY === "number" && isFinite(offY) ? offY : 0))
            const key = `${img ? img.src : ""}|${color}|${tw}|${th}|${off}`
            if (key === tileKey) return tilePat
            tileKey = key
            tilePat = null
            const c = document.createElement("canvas")
            c.width = tw
            c.height = th
            const t = c.getContext("2d")
            if (!t) return null
            t.fillStyle = color
            t.fillRect(0, 0, tw, th)
            if (img) {
                const sc = Math.max(tw / img.naturalWidth, th / img.naturalHeight)
                const dw = img.naturalWidth * sc
                const dh = img.naturalHeight * sc
                t.imageSmoothingQuality = "high"
                t.drawImage(img, (tw - dw) / 2, (th - dh) * (0.5 - (off / 250) * 0.5), dw, dh)
            }
            tilePat = ctx.createPattern(c, "no-repeat")
            return tilePat
        }

        const drawCard = (v: any, adv: any, G: any, ang: number, hoverAmt: number) => {
            const s = G.s
            const P = pts[iP]
            const top = -G.slotY
            const left = -G.hW / 2
            const r = adv.holderRadius * s
            ctx.save()
            ctx.translate(P.x, P.y)
            ctx.rotate(ang)

            const holeR = (adv.holeSize / 2) * s
            const holeX = Math.min(80 * s, G.hW / 2 - holeR - 6 * s)
            const sleevePath = () => {
                rr(ctx, left, top, G.hW, G.hH, r)
                if (holeR > 0)
                    for (const hx of [-holeX, holeX]) {
                        ctx.moveTo(hx + holeR, 0)
                        ctx.arc(hx, 0, holeR, 0, Math.PI * 2)
                    }
                const sw = 30 * s
                const sh = 6.5 * s
                ctx.moveTo(-sw + sh, -sh)
                ctx.lineTo(sw - sh, -sh)
                ctx.arc(sw - sh, 0, sh, -Math.PI / 2, Math.PI / 2)
                ctx.lineTo(-sw + sh, sh)
                ctx.arc(-sw + sh, 0, sh, Math.PI / 2, Math.PI * 1.5)
                ctx.closePath()
            }

            ctx.globalAlpha = Math.max(0, Math.min(1, adv.holderOpacity / 100))
            ctx.fillStyle = adv.holderColor
            sleevePath()
            ctx.fill("evenodd")
            ctx.globalAlpha = 1

            const m = adv.insertMargin * s
            const ix = left + m
            const iy = top + adv.insertTop * s
            const iw = G.hW - 2 * m
            const ih = G.hH - adv.insertTop * s - 8 * s
            const img = getImage(imageSrc(v.image))
            const tile = insertTile(img, v.cardColor, iw, ih, v.imageOffsetY)
            if (tile) {
                tileM.a = tileM.d = 1 / (2 * dpr)
                tileM.e = ix - 1 / (2 * dpr)
                tileM.f = iy - 1 / (2 * dpr)
                tile.setTransform(tileM)
                ctx.fillStyle = tile
            } else ctx.fillStyle = v.cardColor
            ctx.fillRect(ix, iy, iw, ih)

            ctx.lineWidth = 1.5 * s
            ctx.strokeStyle = adv.borderColor
            for (const hx of [-holeX, holeX]) {
                ctx.beginPath()
                ctx.arc(hx, 0, holeR, 0, Math.PI * 2)
                ctx.stroke()
            }
            rr(ctx, -30 * s, -6.5 * s, 60 * s, 13 * s, 6.5 * s)
            ctx.stroke()
            ctx.lineWidth = 1 * s
            ctx.strokeStyle = adv.borderColor
            ctx.beginPath()
            ctx.moveTo(left + 3 * s, top + 48 * s)
            ctx.lineTo(-left - 3 * s, top + 48 * s)
            ctx.stroke()
            ctx.strokeStyle = "#A6A5AD"
            ctx.beginPath()
            ctx.moveTo(left + 3 * s, top + 51 * s)
            ctx.lineTo(-left - 3 * s, top + 51 * s)
            ctx.stroke()

            const gl = adv.gloss / 100
            if (gl > 0) {
                const lg = ctx.createLinearGradient(left, 0, -left, 0)
                lg.addColorStop(0, `rgba(255,255,255,${0.7 * gl})`)
                lg.addColorStop(0.1, "rgba(255,255,255,0)")
                lg.addColorStop(0.86, "rgba(0,0,0,0)")
                lg.addColorStop(1, `rgba(0,0,0,${0.14 * gl})`)
                ctx.fillStyle = lg
                sleevePath()
                ctx.fill("evenodd")
                const sp = 0.35 + Math.sin(ang) * 1.1 + over * hoverAmt * ((ptrX - P.x) / Math.max(1, W)) * 0.6
                if (sp > -0.15 && sp < 1.15) {
                    const bg = ctx.createLinearGradient(left, top, -left, top + G.hH)
                    const a = Math.max(0, Math.min(1, sp - 0.14))
                    const b = Math.max(0, Math.min(1, sp))
                    const c = Math.max(0, Math.min(1, sp + 0.14))
                    bg.addColorStop(a, "rgba(255,255,255,0)")
                    bg.addColorStop(b, `rgba(255,255,255,${0.45 * gl})`)
                    bg.addColorStop(c, "rgba(255,255,255,0)")
                    ctx.fillStyle = bg
                    sleevePath()
                    ctx.fill("evenodd")
                }
            }

            ctx.lineWidth = 2 * s
            ctx.strokeStyle = adv.borderColor
            rr(ctx, left, top, G.hW, G.hH, r)
            ctx.stroke()
            ctx.lineWidth = 1 * s
            ctx.strokeStyle = "rgba(228,228,230,0.8)"
            rr(ctx, left + 5 * s, top + 5 * s, G.hW - 10 * s, G.hH - 10 * s, Math.max(0, r - 4 * s))
            ctx.stroke()
            ctx.restore()
        }

        const drawClip = (v: any, adv: any, G: any, cardAng: number, front: boolean) => {
            const J = pts[iJ]
            const P = pts[iP]
            const Sl = pts[leftIdx[N - 1]]
            const Sr = pts[rightIdx[N - 1]]
            const s = G.s
            const L = Math.hypot(P.x - J.x, P.y - J.y) || 1
            const ux = (P.x - J.x) / L
            const uy = (P.y - J.y) / L
            const ang = Math.atan2(uy, ux) - Math.PI / 2
            const silver = adv.clipColor
            const light = mix(silver, "#FFFFFF", 0.7)
            const dark = mix(silver, "#000000", 0.5)
            const metal = (x0: number, x1: number) => {
                const g = ctx.createLinearGradient(x0, 0, x1, 0)
                g.addColorStop(0, light)
                g.addColorStop(0.35, silver)
                g.addColorStop(0.75, mix(silver, "#000000", 0.2))
                g.addColorStop(1, dark)
                return g
            }

            const T = { x: J.x + ux * 0.3 * L, y: J.y + uy * 0.3 * L }
            const cs = Math.cos(cardAng)
            const sn = Math.sin(cardAng)
            const Bt = { x: P.x - sn * 2 * s, y: P.y + cs * 2 * s }
            const ry = Math.max(4 * s, Math.hypot(Bt.x - T.x, Bt.y - T.y) / 2)
            const rx = ry * 0.55
            const ringW = 4.2 * s
            const ringAng = Math.atan2(Bt.y - T.y, Bt.x - T.x) - Math.PI / 2
            const ringArc = (a0: number, a1: number) => {
                ctx.beginPath()
                ctx.ellipse(0, 0, rx, ry, 0, a0, a1)
            }
            const wire = (a0: number, a1: number, shade: number) => {
                ctx.lineCap = "round"
                ringArc(a0, a1)
                ctx.strokeStyle = mix(dark, "#000000", shade)
                ctx.lineWidth = ringW
                ctx.stroke()
                ringArc(a0, a1)
                ctx.strokeStyle = mix(silver, "#000000", shade)
                ctx.lineWidth = ringW * 0.62
                ctx.stroke()
                ringArc(a0 + 0.12, a1 - 0.12)
                ctx.strokeStyle = `rgba(255,255,255,${0.75 * (1 - shade)})`
                ctx.lineWidth = ringW * 0.2
                ctx.stroke()
            }

            ctx.save()
            ctx.translate((T.x + Bt.x) / 2, (T.y + Bt.y) / 2)
            ctx.rotate(ringAng)
            if (!front) {
                wire(-Math.PI / 2, Math.PI / 2, 0.3)
                ctx.restore()
                return
            }
            ctx.save()
            ctx.shadowColor = "rgba(0,0,0,0.3)"
            ctx.shadowBlur = 3 * s * dpr
            ctx.shadowOffsetX = 1.5 * s * dpr
            ctx.shadowOffsetY = 2 * s * dpr
            ringArc(Math.PI / 2, Math.PI * 1.5)
            ctx.strokeStyle = dark
            ctx.lineWidth = ringW
            ctx.stroke()
            ctx.restore()
            wire(Math.PI / 2, Math.PI * 1.5, 0)
            ctx.restore()

            ctx.save()
            ctx.translate(J.x, J.y)
            ctx.rotate(ang)
            const strapW = adv.strapWidth * s
            ctx.lineCap = "round"
            ctx.lineJoin = "round"

            const tabW = strapW
            const sx = (Sl.x + Sr.x) / 2 - J.x
            const sy = (Sl.y + Sr.y) / 2 - J.y
            const stemLen = Math.hypot(sx, sy) || 1
            const tabLen = Math.min(stemLen, strapW * 0.25)
            ctx.save()
            ctx.rotate(-ang)
            ctx.rotate(Math.atan2(sy, sx) + Math.PI / 2)
            ctx.fillStyle = v.strapColor
            rr(ctx, -tabW / 2, -tabLen, tabW, tabLen + 0.05 * L, tabW * 0.15)
            ctx.fill()
            ctx.restore()

            ctx.lineWidth = 0.034 * L
            ctx.strokeStyle = dark
            ctx.beginPath()
            ctx.ellipse(0, 0.245 * L, 0.05 * L, 0.065 * L, 0, 0, Math.PI * 2)
            ctx.stroke()
            ctx.lineWidth = 0.018 * L
            ctx.strokeStyle = light
            ctx.beginPath()
            ctx.ellipse(0, 0.245 * L, 0.05 * L, 0.065 * L, 0, Math.PI * 0.9, Math.PI * 1.6)
            ctx.stroke()

            const cw = strapW * 1.55
            const ch = 0.22 * L
            ctx.fillStyle = metal(-cw / 2, cw / 2)
            rr(ctx, -cw / 2, -0.03 * L, cw, ch, 0.05 * L)
            ctx.fill()
            ctx.strokeStyle = mix(dark, "#000000", 0.25)
            ctx.lineWidth = 0.016 * L
            ctx.stroke()
            ctx.strokeStyle = "rgba(255,255,255,0.45)"
            ctx.lineWidth = 0.012 * L
            rr(ctx, -cw / 2 + 0.03 * L, -0.03 * L + 0.03 * L, cw - 0.06 * L, ch - 0.06 * L, 0.03 * L)
            ctx.stroke()
            ctx.restore()
        }

        const draw = (v: any, adv: any, G: any, hoverAmt: number) => {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, W, H)
            const s = G.s
            const P = pts[iP]
            const B = pts[iB]
            const ang = Math.atan2(B.y - P.y, B.x - P.x) - Math.PI / 2
            const left = leftIdx.map((i) => pts[i])
            const right = rightIdx.map((i) => pts[i])
            const strapW = adv.strapWidth * s
            const baseL = Math.atan2(G.jy - G.ay, G.spread)
            const baseR = Math.atan2(G.jy - G.ay, -G.spread)

            if (adv.shadowOpacity > 0) {
                withShadow(adv, s, () => {
                    ctx.lineWidth = strapW
                    ctx.lineJoin = "round"
                    polyline(left)
                    ctx.stroke()
                    polyline(right)
                    ctx.stroke()
                })
                withShadow(adv, s, () => {
                    ctx.translate(P.x, P.y)
                    ctx.rotate(ang)
                    rr(ctx, -G.hW / 2, -G.slotY, G.hW, G.hH, adv.holderRadius * s)
                    ctx.fill()
                })
            }

            const sheen = adv.strapSheen / 100
            drawStraps(left, right, baseL, baseR, strapW, v.strapColor, sheen, G.segL)
            drawClip(v, adv, G, ang, false)
            drawCard(v, adv, G, ang, hoverAmt)
            drawClip(v, adv, G, ang, true)

            const vig = adv.vignette / 100
            if (vig > 0) {
                const rg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6)
                rg.addColorStop(0, "rgba(0,0,0,0)")
                rg.addColorStop(1, `rgba(0,0,0,${vig * 0.9})`)
                ctx.fillStyle = rg
                ctx.fillRect(0, 0, W, H)
            }
            const gr = adv.grain / 100
            if (gr > 0) {
                if (!grainPattern) grainPattern = ctx.createPattern(noise, "repeat")
                if (grainPattern) {
                    ctx.save()
                    ctx.globalAlpha = gr * 0.6
                    const ox = Math.floor(Math.random() * 128)
                    const oy = Math.floor(Math.random() * 128)
                    ctx.translate(-ox, -oy)
                    ctx.fillStyle = grainPattern
                    ctx.fillRect(0, 0, W + 128, H + 128)
                    ctx.restore()
                }
            }
        }

        const frame = (now: number) => {
            if (!visible) {
                raf = 0
                return
            }
            raf = requestAnimationFrame(frame)
            if (!ready) return
            const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20)
            last = now
            const v = valsRef.current
            const adv = advOf(v)
            const G = geom(v, adv)
            const hoverAmt = reduced ? 0 : Math.max(0, adv.hover) / 50
            over += (overTarget - over) * (1 - Math.exp(-dt * 6))
            if (!reduced && !isStatic) {
                const simDt = dt * (Math.max(0, v.speed) / 50)
                acc += simDt
                let n = 0
                while (acc >= SUB && n < 24) {
                    step(SUB, v, adv, G, hoverAmt, false)
                    acc -= SUB
                    n++
                }
                if (n >= 24) acc = 0
            }
            draw(v, adv, G, hoverAmt)
        }

        const resize = () => {
            const w = root.offsetWidth
            const h = root.offsetHeight
            if (!w || !h) return
            const changed = w !== W || h !== H
            W = w
            H = h
            dpr = Math.min(2, window.devicePixelRatio || 1)
            canvas.width = Math.round(W * dpr)
            canvas.height = Math.round(H * dpr)
            measureView()
            if (changed) {
                settle()
                ready = true
            }
            const v = valsRef.current
            const adv = advOf(v)
            draw(v, adv, geom(v, adv), 0)
        }

        // ── pointer ──
        const hitCard = (x: number, y: number) => {
            const v = valsRef.current
            const adv = advOf(v)
            const G = geom(v, adv)
            const P = pts[iP]
            const B = pts[iB]
            const len = Math.hypot(B.x - P.x, B.y - P.y) || 1
            const ux = (B.x - P.x) / len
            const uy = (B.y - P.y) / len
            const dx = x - P.x
            const dy = y - P.y
            const lx = dx * uy - dy * ux
            const ly = dx * ux + dy * uy
            const pad = 6
            if (Math.abs(lx) <= G.hW / 2 + pad && ly >= -G.slotY - pad && ly <= G.stick + pad)
                return { t: Math.max(0.02, Math.min(1, ly / G.stick)), lx }
            return null
        }

        const onDown = (e: PointerEvent) => {
            if (reduced || isStatic) return
            const adv = advOf(valsRef.current)
            if (adv.hover <= 0) return
            const x = e.offsetX
            const y = e.offsetY
            const hit = hitCard(x, y)
            if (!hit) return
            userDrag = { t: hit.t, lx: hit.lx, tx: x, ty: y }
            try {
                root.setPointerCapture(e.pointerId)
            } catch {}
            root.style.cursor = "grabbing"
            e.preventDefault()
        }
        const onMove = (e: PointerEvent) => {
            ptrX = e.offsetX
            ptrY = e.offsetY
            overTarget = 1
            if (userDrag) {
                userDrag.tx = ptrX
                userDrag.ty = ptrY
                return
            }
            if (!reduced) root.style.cursor = hitCard(ptrX, ptrY) ? "grab" : "default"
        }
        const onLeave = () => {
            if (!userDrag) overTarget = 0
        }
        const onUp = (e: PointerEvent) => {
            if (!userDrag) return
            userDrag = null
            try {
                root.releasePointerCapture(e.pointerId)
            } catch {}
            root.style.cursor = "grab"
        }

        root.addEventListener("pointerdown", onDown)
        root.addEventListener("pointermove", onMove)
        root.addEventListener("pointerleave", onLeave)
        window.addEventListener("pointerup", onUp)
        window.addEventListener("pointercancel", onUp)

        const ro = new ResizeObserver(resize)
        ro.observe(root)
        if (clipEl) ro.observe(clipEl)
        resize()
        const io = new IntersectionObserver(([e]) => {
            visible = e.isIntersecting
            if (visible && !raf) {
                last = -1
                raf = requestAnimationFrame(frame)
            }
        })
        io.observe(root)
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            io.disconnect()
            root.removeEventListener("pointerdown", onDown)
            root.removeEventListener("pointermove", onMove)
            root.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [])

    return (
        <div
            ref={rootRef}
            className={props.className}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                touchAction: "none",
                userSelect: "none",
                background,
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
            />
        </div>
    )
}

const __originkitPresetProps = {
  "background": "#00000000",
  "strapColor": "#ea580c"
};

export default function SwingingLanyardBadge(props: Record<string, unknown>) {
  return <__OriginkitBase_SwingingLanyardBadge {...(__originkitPresetProps as Record<string, unknown>)} {...props} />;
}
