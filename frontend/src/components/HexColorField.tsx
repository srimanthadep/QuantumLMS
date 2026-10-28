import React from "react"

export interface HexColorFieldProps {
  hexColor: string
  onChangeHex: (color: string) => void
}

export function HexColorField({ hexColor, onChangeHex }: HexColorFieldProps) {
  return (
    <div className="hex-field-box">
      <span className="hex-badge">HEX</span>
      <input
        type="color"
        value={hexColor.startsWith("#") ? hexColor : `#${hexColor}`}
        onChange={(e) => onChangeHex(e.target.value)}
        className="hex-swatch"
        title="Choose custom background color"
      />
      <div className="hex-input-inner">
        <input
          type="text"
          value={hexColor}
          onChange={(e) => onChangeHex(e.target.value)}
          placeholder="#F8FAFC"
          maxLength={7}
          aria-label="Hex color value"
        />
      </div>
    </div>
  )
}

export default HexColorField
