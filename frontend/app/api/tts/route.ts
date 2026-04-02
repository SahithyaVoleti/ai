import { NextResponse } from "next/server";
import * as googleTTS from "google-tts-api";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text is required and cannot be empty" },
        { status: 400 }
      );
    }

    console.log("🔊 Generating Free Cloud TTS:", text.slice(0, 50), "...");

    const results = await googleTTS.getAllAudioBase64(text, {
      lang: "en",
      slow: false,
      host: "https://translate.google.com",
      splitPunct: ",.?",
    });

    // Reconstruct Buffer from returned base64 chunks
    const buffers = results.map((res: any) => Buffer.from(res.base64, "base64"));
    const finalBuffer = Buffer.concat(buffers);

    return new Response(finalBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error: any) {
    console.error("❌ Google Cloud TTS Error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to generate speech", 
        details: error.message || "Internal server error" 
      },
      { status: 500 }
    );
  }
}
