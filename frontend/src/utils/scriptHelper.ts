import { StoryPitch, ScriptSection, DocumentaryScript } from "@/types";

export const DEFAULT_5_ACT_TITLES = [
  "COLD OPEN // THE HOOK",
  "ACT I // THE PRESENT CATALYST",
  "ACT II // THE TIME MACHINE (HISTORICAL ECHO)",
  "ACT III // THE MICRO CAUSE & EFFECT",
  "OUTRO // THE BIG TAKEAWAY",
];

export function getStorySections(story: StoryPitch): ScriptSection[] {
  const script = story.script;
  if (!script) return [];

  // If already in 5-section format
  if (Array.isArray(script.sections) && script.sections.length > 0) {
    return script.sections;
  }

  // Convert 4-act structure into standardized 5 sections
  const sections: ScriptSection[] = [];

  // 1. Cold Open
  if (script.coldOpen) {
    sections.push({
      act: "COLD OPEN // THE HOOK",
      cue: script.coldOpen.visualCue || "[CAPCUT CUES]\n• Cinematic establishing drone shot pushing into key location at dusk\n• Text overlay: JetBrains Mono coordinates & headline\n• Audio SFX: Sub-bass swell and tape rewind drop",
      narration: script.coldOpen.narration || "",
      timestamp: script.coldOpen.timestamp || "0:00 – 1:15",
    });
  }

  // 2. Act I
  if (script.actI) {
    sections.push({
      act: "ACT I // THE PRESENT CATALYST",
      cue: script.actI.visualCue || "[CAPCUT CUES]\n• Split-screen B-roll comparing corporate PR vs underlying financial filings\n• Interactive chart animation highlighting diverging trend lines",
      narration: script.actI.narration || "",
      timestamp: script.actI.timestamp || "1:15 – 3:30",
    });
  }

  // 3. Act II
  if (script.actII) {
    sections.push({
      act: "ACT II // THE TIME MACHINE (HISTORICAL ECHO)",
      cue: script.actII.visualCue || "[CAPCUT CUES]\n• Archival footage grain filter with vintage broadcast audio clips\n• Lower third title card: HISTORICAL PARALLEL PRECEDENT",
      narration: script.actII.narration || "",
      timestamp: script.actII.timestamp || "3:30 – 6:00",
    });
  }

  // 4. Act III
  if (script.actIII) {
    sections.push({
      act: "ACT III // THE MICRO CAUSE & EFFECT",
      cue: script.actIII.visualCue || "[CAPCUT CUES]\n• Intimate macro close-ups: household bills, grocery receipts, local utility meters\n• 3D animated diagram tracking cost transmission from wholesale to retail",
      narration: script.actIII.narration || "",
      timestamp: script.actIII.timestamp || "6:00 – 8:45",
    });
  }

  // 5. Outro (Synthesized takeaway if not present)
  if (script.outro) {
    sections.push({
      act: "OUTRO // THE BIG TAKEAWAY",
      cue: script.outro.visualCue,
      narration: script.outro.narration,
      timestamp: script.outro.timestamp || "8:45 – 10:00",
    });
  } else {
    sections.push({
      act: "OUTRO // THE BIG TAKEAWAY",
      cue: "[CAPCUT CUES]\n• Fast punchy recap motion graphics linking Macro Trigger → Historical Precedent → Household Surcharge\n• Warm resolving acoustic guitar and synthesizer crescendo\n• Final title card with key consumer action takeaway",
      narration: `The dots have always been connected. The challenge is that Wall Street and political soundbites are designed to keep you focused on the immediate splash, rather than the wave heading toward your shore.\n\nBy understanding how the macro trigger connects to historical precedents, you no longer have to be surprised when the bill lands on your table. You can anticipate the curve before it arrives.\n\nSubscribe for more autonomous documentary investigations, and drop your thoughts in the comments below.`,
      timestamp: "8:45 – 10:00",
    });
  }

  return sections;
}
