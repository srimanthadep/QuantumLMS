import { useState, useEffect, useRef } from "react"
import { DEFAULT_BG_HEX, isValidHexColor, normalizeHexColor } from "../utils/colorUtils"

export function HexColorField({
  hexColor,
  onChangeHex,
}: {
  hexColor: string
  onChangeHex: (color: string) => void
}) {
  const [localVal, setLocalVal] = useState(hexColor)
  const colorPickerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalVal(hexColor)
  }, [hexColor])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setLocalVal(raw)
    if (isValidHexColor(raw)) {
      onChangeHex(normalizeHexColor(raw))
    }
  }

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setLocalVal(color)
    onChangeHex(color)
  }

  const handleReset = () => {
    setLocalVal(DEFAULT_BG_HEX)
    onChangeHex(DEFAULT_BG_HEX)
  }

  const isCustom = hexColor.toLowerCase() !== DEFAULT_BG_HEX.toLowerCase()

  return (
    <div
      className="hex-field-box"
      title="Enter any hex color code or click swatch to change entire background"
    >
      <label htmlFor="hex-field-input" className="hex-badge" title="Background HEX color">
        HEX
      </label>
      <button
        type="button"
        className="hex-swatch"
        style={{ backgroundColor: hexColor }}
        onClick={() => colorPickerRef.current?.click()}
        title="Click to open color picker"
        aria-label="Pick background color"
      >
        <input
          ref={colorPickerRef}
          type="color"
          value={hexColor.length === 7 ? hexColor : DEFAULT_BG_HEX}
          onChange={handlePickerChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </button>
      <div className="hex-input-inner">
        <input
          id="hex-field-input"
          name="hex"
          type="text"
          value={localVal}
          onChange={handleInputChange}
          placeholder="#9860e9"
          maxLength={9}
          aria-label="Hex color for background"
          spellCheck={false}
          autoComplete="off"
        />
        {isCustom && (
          <button
            type="button"
            className="hex-reset-btn"
            onClick={handleReset}
            title="Reset to default background color"
            aria-label="Reset color"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
