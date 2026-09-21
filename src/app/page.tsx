import AIVoiceChatbotEngine from "@/components/AIVoiceChatbotEngine";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "1100px" }}>
        <AIVoiceChatbotEngine />
      </div>
    </main>
  );
}
