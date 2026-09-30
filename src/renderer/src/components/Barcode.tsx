import { encodeCode39 } from '../utils/barcode'

interface BarcodeProps {
  value: string
  moduleWidth?: number
  height?: number
}

// Margen en blanco a cada lado que los escáneres necesitan para detectar el inicio y el fin
const QUIET_ZONE_MODULES = 10

export function Barcode({ value, moduleWidth = 2, height = 70 }: BarcodeProps) {
  const modules = encodeCode39(value)
  if (!modules) return null

  const bars: { x: number; width: number }[] = []
  let runStart = -1
  for (let i = 0; i <= modules.length; i++) {
    const isBar = modules[i] === '1'
    if (isBar && runStart === -1) runStart = i
    if (!isBar && runStart !== -1) {
      bars.push({ x: (runStart + QUIET_ZONE_MODULES) * moduleWidth, width: (i - runStart) * moduleWidth })
      runStart = -1
    }
  }

  const width = (modules.length + QUIET_ZONE_MODULES * 2) * moduleWidth

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Código de barras ${value}`}
    >
      <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
      {bars.map(bar => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.width} height={height} fill="#000000" />
      ))}
    </svg>
  )
}
