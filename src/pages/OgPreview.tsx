const OgPreview = () => {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        background: "#FAF8F5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Georgia, 'Times New Roman', serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Sunglasses icon */}
      <svg
        viewBox="0 0 40 16"
        width={120}
        height={48}
        xmlns="http://www.w3.org/2000/svg"
        style={{ marginBottom: 24 }}
      >
        <path
          d="M2 6.5 C2 3 4.5 1.5 8 1.5 L11 1.5 C14.5 1.5 17 3 17 6.5 L17 9.5 C17 13 14.5 14.5 11 14.5 L8 14.5 C4.5 14.5 2 13 2 9.5 Z"
          fill="#1A1A1A"
          transform="rotate(-2 9.5 8)"
        />
        <path
          d="M23 6.5 C23 3 25.5 1.5 29 1.5 L32 1.5 C35.5 1.5 38 3 38 6.5 L38 9.5 C38 13 35.5 14.5 32 14.5 L29 14.5 C25.5 14.5 23 13 23 9.5 Z"
          fill="#1A1A1A"
          transform="rotate(-2 30.5 8)"
        />
        <path
          d="M17 7 Q20 4 23 7"
          fill="none"
          stroke="#1A1A1A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M2 5 L-1 3"
          fill="none"
          stroke="#1A1A1A"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M38 5 L41 3"
          fill="none"
          stroke="#1A1A1A"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {/* Wordmark */}
      <div
        style={{
          fontSize: 42,
          fontWeight: 600,
          letterSpacing: 12,
          color: "#1A1A1A",
          textTransform: "uppercase",
          marginBottom: 16,
        }}
      >
        Cook A Look
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 24,
          fontWeight: 400,
          letterSpacing: 2,
          color: "#6B6560",
          fontStyle: "italic",
        }}
      >
        Discover your personal style.
      </div>
    </div>
  );
};

export default OgPreview;
