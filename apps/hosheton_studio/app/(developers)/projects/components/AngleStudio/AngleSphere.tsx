'use client';

import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LuChevronDown, LuChevronLeft, LuChevronRight, LuChevronUp } from 'react-icons/lu';
import {
    ANGLE_LIMITS,
    signedDegrees,
    wrapDegrees,
    type AngleCamera,
    type AngleLight,
} from '../../lib/angle-studio';
import styles from './AngleStudio.module.scss';

/** شعاع کره در مختصات SVG */
const R = 100;
/** ناظر کمی بالاتر از استوا ایستاده تا کره سه‌بعدی دیده شود */
const VIEW_PITCH = (22 * Math.PI) / 180;
const COS_P = Math.cos(VIEW_PITCH);
const SIN_P = Math.sin(VIEW_PITCH);
const DEG = Math.PI / 180;

type Projected = { x: number; y: number; depth: number };

/** نقطهٔ (azimuth, elevation) روی کره → مختصات SVG (نمای ارتوگرافیک) */
function project(azimuth: number, elevation: number, radius = 1): Projected {
    const a = azimuth * DEG;
    const e = elevation * DEG;
    const X = Math.cos(e) * Math.sin(a);
    const Y = Math.sin(e);
    const Z = Math.cos(e) * Math.cos(a);
    const screenY = Y * COS_P - Z * SIN_P;
    return { x: X * R * radius, y: -screenY * R * radius, depth: Y * SIN_P + Z * COS_P };
}

/** کلیک روی نیم‌کرهٔ جلو → (azimuth, elevation) */
function unproject(x: number, y: number): { azimuth: number; elevation: number } | null {
    const ux = x / R;
    const uy = -y / R;
    const rr = ux * ux + uy * uy;
    if (rr > 1) return null;
    const d = Math.sqrt(1 - rr);
    const X = ux;
    const Y = uy * COS_P + d * SIN_P;
    const Z = -uy * SIN_P + d * COS_P;
    return { azimuth: Math.atan2(X, Z) / DEG, elevation: Math.asin(Math.max(-1, Math.min(1, Y))) / DEG };
}

/** منحنی → دو مسیر SVG (جلو و پشت کره) */
function curvePaths(points: Projected[]): { front: string; back: string } {
    let front = '';
    let back = '';
    let prevSide: 'front' | 'back' | null = null;
    for (const point of points) {
        const side = point.depth >= 0 ? 'front' : 'back';
        const cmd = `${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
        if (side === 'front') front += `${prevSide === 'front' ? 'L' : 'M'}${cmd} `;
        else back += `${prevSide === 'back' ? 'L' : 'M'}${cmd} `;
        prevSide = side;
    }
    return { front, back };
}

const GRID = (() => {
    const lines: Array<{ front: string; back: string; equator?: boolean }> = [];
    for (const elevation of [-60, -30, 0, 30, 60]) {
        const points: Projected[] = [];
        for (let a = 0; a <= 360; a += 6) points.push(project(a, elevation));
        lines.push({ ...curvePaths(points), equator: elevation === 0 });
    }
    for (let azimuth = 0; azimuth < 180; azimuth += 30) {
        const points: Projected[] = [];
        for (let e = -90; e <= 270; e += 6) {
            // یک نصف‌النهار کامل (دو طرف کره) با یک مسیر
            const onFar = e > 90;
            points.push(project(onFar ? azimuth + 180 : azimuth, onFar ? 180 - e : e));
        }
        lines.push(curvePaths(points));
    }
    return lines;
})();

export type AngleSphereTarget = 'camera' | 'light';

export type AngleSphereMarker = { id: string; camera: AngleCamera; index: number };

export default function AngleSphere({
    camera,
    light,
    target,
    imageUrl,
    markers,
    disabled = false,
    onCameraChange,
    onLightChange,
}: {
    camera: AngleCamera;
    light: AngleLight;
    target: AngleSphereTarget;
    imageUrl?: string;
    /** نماهای دیگر (یا ۱۲ زاویه) به شکل نقطه */
    markers?: AngleSphereMarker[];
    disabled?: boolean;
    onCameraChange: (camera: AngleCamera) => void;
    onLightChange: (light: AngleLight) => void;
}) {
    const { t } = useTranslation('projects');
    const svgRef = useRef<SVGSVGElement>(null);
    const dragRef = useRef<{ x: number; y: number; moved: boolean; startAz: number; startEl: number } | null>(null);
    const [dragging, setDragging] = useState(false);

    const editingLight = target === 'light';
    const active = editingLight
        ? { azimuth: light.azimuth, elevation: light.elevation }
        : { azimuth: camera.azimuth, elevation: camera.elevation };
    const limits = editingLight ? ANGLE_LIMITS.lightElevation : ANGLE_LIMITS.cameraElevation;

    const apply = useCallback((azimuth: number, elevation: number) => {
        const next = {
            azimuth: wrapDegrees(azimuth),
            elevation: Math.round(Math.min(limits.max, Math.max(limits.min, elevation))),
        };
        if (editingLight) onLightChange({ ...light, ...next, enabled: true, presetId: undefined });
        else onCameraChange({ ...camera, ...next });
    }, [camera, editingLight, light, limits.max, limits.min, onCameraChange, onLightChange]);

    const toSvg = (event: { clientX: number; clientY: number }) => {
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        const scale = 280 / rect.width;
        return {
            x: (event.clientX - rect.left) * scale - 140,
            y: (event.clientY - rect.top) * scale - 140,
        };
    };

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (disabled || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
            x: event.clientX,
            y: event.clientY,
            moved: false,
            startAz: active.azimuth,
            startEl: active.elevation,
        };
        setDragging(true);
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag) return;
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 4) return;
        drag.moved = true;
        // کشیدن به راست = دوربین/نور به راست کره؛ بالا = بالاتر
        apply(drag.startAz + dx * 0.7, drag.startEl - dy * 0.5);
    };

    const endDrag = (event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        dragRef.current = null;
        setDragging(false);
        if (!drag || drag.moved) return;
        // کلیک بدون کشیدن: نشانگر به همان نقطهٔ کره می‌پرد
        const point = toSvg(event);
        if (!point) return;
        const hit = unproject(point.x, point.y);
        if (hit) apply(hit.azimuth, hit.elevation);
    };

    const step = (dAzimuth: number, dElevation: number) => {
        if (disabled) return;
        apply(active.azimuth + dAzimuth, active.elevation + dElevation);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const big = event.shiftKey ? 3 : 1;
        if (event.key === 'ArrowLeft') step(-15 * big, 0);
        else if (event.key === 'ArrowRight') step(15 * big, 0);
        else if (event.key === 'ArrowUp') step(0, 5 * big);
        else if (event.key === 'ArrowDown') step(0, -5 * big);
        else if (!editingLight && (event.key === '+' || event.key === '=')) {
            onCameraChange({ ...camera, zoom: Math.min(ANGLE_LIMITS.zoom.max, camera.zoom + 1) });
        } else if (!editingLight && (event.key === '-' || event.key === '_')) {
            onCameraChange({ ...camera, zoom: Math.max(ANGLE_LIMITS.zoom.min, camera.zoom - 1) });
        } else return;
        event.preventDefault();
    };

    const cameraPoint = project(camera.azimuth, camera.elevation, 1 - camera.zoom * 0.025);
    const lightPoint = project(light.azimuth, light.elevation, 1.14);
    const showLight = light.enabled || editingLight;
    const turn = signedDegrees(camera.azimuth);
    const behind = Math.abs(turn) > 100;
    // کارت عکس وسط کره همراه دوربین می‌چرخد (پیش‌نمایش حسی، نه دقیق)
    const cardTransform = `perspective(420px) rotateY(${(-Math.max(-75, Math.min(75, turn)) * 0.75).toFixed(1)}deg) rotateX(${(camera.elevation * 0.45).toFixed(1)}deg) scale(${(1 + camera.zoom * 0.03).toFixed(3)})`;

    const markerPoints = useMemo(
        () => (markers || []).map((marker) => ({
            ...marker,
            point: project(marker.camera.azimuth, marker.camera.elevation, 1 - marker.camera.zoom * 0.025),
        })),
        [markers],
    );

    const rays = Array.from({ length: 8 }, (_, index) => {
        const angle = (index * Math.PI) / 4;
        return {
            x1: Math.cos(angle) * 11,
            y1: Math.sin(angle) * 11,
            x2: Math.cos(angle) * 15,
            y2: Math.sin(angle) * 15,
        };
    });

    const valueText = editingLight
        ? t('angle_sphere_light_value', { turn: signedDegrees(light.azimuth), tilt: light.elevation })
        : t('angle_sphere_camera_value', { turn, tilt: camera.elevation, zoom: camera.zoom });

    return (
        <div className={styles.sphereShell} dir="ltr">
            <button
                type="button"
                className={`${styles.sphereArrow} ${styles.arrowTop}`}
                aria-label={t('angle_tilt_up')}
                disabled={disabled}
                onClick={() => step(0, 15)}
            >
                <LuChevronUp size={14} />
            </button>
            <button
                type="button"
                className={`${styles.sphereArrow} ${styles.arrowLeft}`}
                aria-label={t('angle_rotate_left')}
                disabled={disabled}
                onClick={() => step(-45, 0)}
            >
                <LuChevronLeft size={14} />
            </button>
            <div
                className={`${styles.sphereStage} ${dragging ? styles.sphereDragging : ''} ${disabled ? styles.sphereDisabled : ''}`}
                role="application"
                tabIndex={disabled ? -1 : 0}
                aria-label={editingLight ? t('angle_sphere_light_label') : t('angle_sphere_camera_label')}
                aria-roledescription={t('angle_sphere_role')}
                aria-valuetext={valueText}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={onKeyDown}
            >
                <svg ref={svgRef} viewBox="-140 -140 280 280" className={styles.sphereSvg} aria-hidden>
                    {GRID.map((line, index) => (
                        <g key={index}>
                            <path d={line.back} className={styles.gridBack} />
                            <path d={line.front} className={line.equator ? styles.gridEquator : styles.gridFront} />
                        </g>
                    ))}
                    <circle r={R} className={styles.sphereOutline} />

                    {markerPoints.map(({ id, index, point }) => (
                        <g key={id} transform={`translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`} opacity={point.depth >= 0 ? 0.95 : 0.4}>
                            <rect x={-7} y={-7} width={14} height={14} rx={4} className={styles.shotDot} />
                            <text className={styles.shotDotText} textAnchor="middle" dominantBaseline="central">
                                {index + 1}
                            </text>
                        </g>
                    ))}

                    {showLight ? (
                        <g opacity={lightPoint.depth >= 0 ? 1 : 0.45}>
                            <line
                                x1={0}
                                y1={0}
                                x2={lightPoint.x}
                                y2={lightPoint.y}
                                stroke={light.color}
                                className={lightPoint.depth >= 0 ? styles.lightRay : styles.lightRayBack}
                            />
                            <g transform={`translate(${lightPoint.x.toFixed(1)} ${lightPoint.y.toFixed(1)})`}>
                                <circle r={18} fill={light.color} opacity={0.18} />
                                {rays.map((ray, index) => (
                                    <line key={index} {...ray} stroke={light.color} className={styles.sunRay} />
                                ))}
                                <circle r={8} fill={light.color} className={styles.sunCore} />
                            </g>
                        </g>
                    ) : null}

                    <g opacity={cameraPoint.depth >= 0 ? 1 : 0.5}>
                        <line
                            x1={0}
                            y1={0}
                            x2={cameraPoint.x}
                            y2={cameraPoint.y}
                            className={cameraPoint.depth >= 0 ? styles.cameraRay : styles.cameraRayBack}
                        />
                        <g
                            transform={`translate(${cameraPoint.x.toFixed(1)} ${cameraPoint.y.toFixed(1)}) scale(${cameraPoint.depth >= 0 ? 1 : 0.85})`}
                            className={!editingLight ? styles.markerActive : undefined}
                        >
                            <rect x={-11} y={-8} width={22} height={16} rx={4.5} className={styles.cameraBody} />
                            <rect x={-5} y={-11.5} width={10} height={4.5} rx={1.5} className={styles.cameraBody} />
                            <circle r={4.4} className={styles.cameraLens} />
                        </g>
                    </g>
                </svg>
                <div
                    className={`${styles.sphereCard} ${behind ? styles.sphereCardBehind : ''}`}
                    style={{ transform: cardTransform }}
                    aria-hidden
                >
                    {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt="" draggable={false} />
                    ) : (
                        <span className={styles.sphereCardEmpty} />
                    )}
                </div>
            </div>
            <button
                type="button"
                className={`${styles.sphereArrow} ${styles.arrowRight}`}
                aria-label={t('angle_rotate_right')}
                disabled={disabled}
                onClick={() => step(45, 0)}
            >
                <LuChevronRight size={14} />
            </button>
            <button
                type="button"
                className={`${styles.sphereArrow} ${styles.arrowBottom}`}
                aria-label={t('angle_tilt_down')}
                disabled={disabled}
                onClick={() => step(0, -15)}
            >
                <LuChevronDown size={14} />
            </button>
        </div>
    );
}
