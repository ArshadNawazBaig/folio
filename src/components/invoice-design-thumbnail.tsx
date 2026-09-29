import { invoiceDesignColors, type InvoiceDesign } from '@/lib/invoice-designs';

/** Small vector previews use the same design recipe as the full invoice. */
export function InvoiceDesignThumbnail({
  design,
  accent,
}: {
  design: InvoiceDesign;
  accent: string;
}) {
  const colors = invoiceDesignColors(accent);
  const dark = design.header === 'dark',
    banner = design.header === 'banner';
  const centered = design.header === 'centered',
    monogram = design.header === 'monogram';
  const split = design.header === 'split',
    outlined = design.header === 'outline';
  const titleX = centered ? 105 : monogram ? 47 : split || outlined ? 25 : 18;
  const titleColor = dark ? '#ffffff' : banner || split ? colors.onAccent : colors.text;
  return (
    <svg viewBox="0 0 210 260" aria-hidden="true" focusable="false">
      <rect width="210" height="260" fill="#ffffff" />
      {design.frame === 'side' && <rect width="5" height="260" fill={accent} />}
      {design.frame === 'rail' && (
        <>
          <rect width="13" height="260" fill={colors.tint} />
          <rect width="4" height="260" fill={accent} />
        </>
      )}
      {design.frame === 'top' && <rect width="210" height="5" fill={accent} />}
      {design.frame === 'border' && (
        <rect x="7" y="7" width="196" height="246" fill="none" stroke={accent} />
      )}
      {design.frame === 'double' && (
        <path d="M18 11H192 M18 14H192" stroke={accent} strokeWidth="0.7" />
      )}
      {(dark || banner) && <rect width="210" height="60" fill={dark ? '#252c26' : accent} />}
      {split && <rect x="18" y="18" width="106" height="42" fill={accent} />}
      {outlined && <rect x="18" y="18" width="174" height="42" fill="none" stroke={accent} />}
      {monogram && (
        <>
          <circle cx="29" cy="35" r="12" fill={colors.tint} stroke={accent} />
          <text x="29" y="38" textAnchor="middle" fontSize="8" fill={colors.text}>
            NF
          </text>
        </>
      )}
      <text
        x={titleX}
        y="29"
        fontSize="3.5"
        letterSpacing="0.7"
        textAnchor={centered ? 'middle' : undefined}
        fill={titleColor}
      >
        A RECORD OF GOOD WORK
      </text>
      <text
        x={titleX}
        y="45"
        fontFamily={design.serif ? 'Georgia, serif' : 'Arial, sans-serif'}
        fontSize={design.header === 'masthead' ? 12 : 16}
        fontWeight={design.serif || design.id === 'minimal' ? 400 : 700}
        textAnchor={centered ? 'middle' : undefined}
        fill={titleColor}
      >
        INVOICE
      </text>
      {(design.header === 'masthead' || centered) && <path d="M18 54H192" stroke={accent} />}
      {design.header === 'masthead' && <path d="M18 57H192" stroke={accent} strokeWidth="0.5" />}
      <g fill="#60675e" fontFamily="Arial, sans-serif" fontSize="5">
        <text x="18" y="75">
          INV-001
        </text>
        <text x="192" y="75" textAnchor="end">
          DUE IN 14 DAYS
        </text>
        <text x="18" y="95" fill={colors.text}>
          FROM
        </text>
        <text x="116" y="95" fill={colors.text}>
          BILL TO
        </text>
        <text x="18" y="105">
          Your business
        </text>
        <text x="116" y="105">
          Your customer
        </text>
      </g>
      <path d="M18 113H75 M116 113H173" stroke="#d0d3cc" strokeWidth="2" />
      <rect
        x="18"
        y="128"
        width="174"
        height="15"
        fill={
          design.table === 'dark' ? '#252c26' : design.table === 'ruled' ? '#ffffff' : colors.tint
        }
      />
      <g
        fontFamily="Arial, sans-serif"
        fontSize="4.5"
        fill={design.table === 'dark' ? '#ffffff' : '#454b42'}
      >
        <text x="23" y="138">
          DESCRIPTION
        </text>
        <text x="187" y="138" textAnchor="end">
          AMOUNT
        </text>
      </g>
      {[0, 1, 2].map((row) => (
        <g key={row}>
          {design.table === 'striped' && row % 2 === 0 && (
            <rect x="18" y={145 + row * 15} width="174" height="15" fill={colors.tint} />
          )}
          <path
            d={`M23 ${152 + row * 15}H${row === 1 ? 93 : 108} M166 ${152 + row * 15}H187`}
            stroke="#a8afa3"
            strokeWidth="2"
          />
          <path d={`M18 ${160 + row * 15}H192`} stroke="#e0e3db" strokeWidth="0.6" />
        </g>
      ))}
      {design.table === 'grid' && (
        <path
          d="M18 128V190 M128 128V190 M146 128V190 M162 128V190 M192 128V190"
          stroke="#c9cfc2"
          strokeWidth="0.7"
        />
      )}
      <path d="M118 201H140 M172 201H188" stroke="#b6bcb1" strokeWidth="2" />
      <rect
        x="109"
        y="209"
        width="83"
        height="20"
        fill={
          design.balance === 'filled' ? accent : design.balance === 'soft' ? colors.tint : '#ffffff'
        }
        stroke={design.balance === 'outline' ? accent : 'none'}
      />
      {design.balance === 'line' && <path d="M109 209H192" stroke="#c9cfc2" />}
      <text
        x="115"
        y="222"
        fontFamily="Arial, sans-serif"
        fontSize="5.5"
        fill={design.balance === 'filled' ? colors.onAccent : colors.text}
      >
        BALANCE
      </text>
      <text
        x="187"
        y="222"
        textAnchor="end"
        fontFamily="Arial, sans-serif"
        fontSize="6"
        fontWeight="700"
        fill={design.balance === 'filled' ? colors.onAccent : colors.text}
      >
        800.00
      </text>
      <path d="M18 242H83" stroke="#d0d3cc" strokeWidth="2" />
    </svg>
  );
}
