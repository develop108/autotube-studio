#!/usr/bin/env python3
"""Build the 150 winter "nature fail -> escape" Seedance 2.0 prompts into one Markdown file.

Story data lives in data/*.txt. Each story block starts with a line '===' and contains
single-line fields (KEY: value) plus exactly 15 timeline beats (lines starting with '- ').
"""
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
DATA = HERE / "data"
OUT = HERE / "winter-escape-150-seedance-prompts.md"

FIELDS = ["T", "LOC", "ENV", "WHO", "ANI", "CAM", "HOOK", "SND", "TEX", "CONT", "AV"]
MIN_CHARS = 3000
RAW_MIN = 3000  # unique, story-specific characters per prompt (excludes shared boilerplate)

LOOK_VARIANTS = [
    "True-to-life smartphone color science: snow rendered bright but never clipped to flat white, with visible crystal sparkle and cool blue-gray shading inside footprints and drifts; skin tones natural with cold-flushed cheeks, nose tips and knuckles; subtle sensor noise in the shadows, mild phone HDR tone mapping, faint compression texture in falling snow. No cinematic grading, no teal-and-orange look, no added film grain, no vignette, no beauty filter.",
    "Looks exactly like an unedited clip straight off a modern iPhone or Pixel: auto white balance drifting slightly cooler in shade and warmer near artificial light, highlight roll-off on sunlit snow, honest contrast, occasional lens flare only when a real light source enters frame, natural softness at the extreme edges of the lens. Skin shows real texture, redness from the cold and dry, chapped lips. Nothing stylized, nothing graded, nothing glossy.",
    "Documentary-real phone footage: exposure set by the phone's auto mode so snow sits just below clipping and shadows hold a little noise; colors are muted and natural, never saturated; breath vapor catches the light; snow surfaces show wind ripples, sastrugi, boot holes and blue shadow. No color grade, no filters, no artificial glow, no dreamy haze, no sharpening halos.",
    "Raw social-media realism: the image has the slightly flat, true-to-life tonality of a phone camera in cold weather, with believable dynamic range, crisp but not oversharpened detail, faint rolling-shutter skew on the fastest pans, and realistic white-balance shifts as the lens moves between bright snow and darker subjects. Faces and hands look lived-in and cold, never airbrushed.",
]

CAM_HANDHELD = [
    "Authentic handheld behavior throughout: micro-jitter from cold hands, breathing sway, footsteps transmitted into the frame, a brief autofocus hunt when the subject moves fast, exposure re-adjusting as the lens swings from bright snow to darker subjects, a 3–8 degree horizon tilt during the panic, and one fast whip-pan blur that resolves naturally. Standard phone main lens (about 26mm equivalent), no zoom pumping, no gimbal-smooth gliding, no drone-like motion.",
    "Real person filming on a phone: the frame breathes and bobs with the operator's body, the grip shifts when they gasp, focus briefly pulses before locking onto the nearest face or animal, and the auto-exposure visibly brightens or darkens as the scene changes. During the crisis the framing becomes messy and partly misses the action for a moment before the operator recovers it. No cinematic dolly moves, no perfect composition, no impossible angles.",
    "Imperfect amateur camerawork that sells authenticity: slight tilt, uneven headroom, quick reframing, a moment of the camera pointing at the snow or sky while the operator moves, then snapping back to the subject. Autofocus locks on the closest high-contrast object and occasionally racks between foreground snowflakes and the subject. Motion blur appears naturally on fast movement at a 1/60–1/120 phone shutter.",
]

CAM_FIXED = [
    "Because the phone is static, the frame never moves on its own: no pans, no zooms, no stabilization drift. Only real-world disturbances affect it — a gust vibrating the mount, a thud shaking the frame, snow or frost touching the lens. Auto-exposure and focus still behave like a phone: brief brightness shifts when light changes, slight focus breathing when something passes very close to the lens.",
    "Fixed-position phone footage with zero camera movement except physical shocks transmitted through the surface it rests on. The action happens within and partly outside the frame, like real security or vlog footage. The phone's auto-exposure reacts to the event (bright snow cloud, sudden shadow) and recovers within half a second. No artificial reframing, no digital zoom, no cuts.",
]

AUDIO_VARIANTS = [
    "Phone-mic characteristics: slightly compressed dynamic range, low-frequency wind rumble whenever gusts hit the microphone, a brief digital clip and automatic gain duck on the loudest crash followed by natural recovery. Voices are close and uneven in level — the operator's voice is loudest and distorts a little when shouting, others sound farther and airier. Breathing, nylon jacket swish, boot crunch and the animal's vocalizations are spatially correct and perfectly in sync with on-screen action. Dialogue is short, overlapping, natural North American English, with real fear and real relief, never movie lines.",
    "Recorded as one live phone mic track: ambient cold-air quietness first (which makes the sudden event hit harder), then a real transient spike, mic overload crackle, and the room or landscape ringing out afterwards. Off-axis sounds are duller, close sounds are sharper. Exhales and gasps are audible, the animal's panting, barking, snorting or calls are species-true, and every footstep or impact lines up with the picture to the frame. Speech is unscripted, imperfect, with stumbles, swearing replaced by real-sounding exclamations, and natural accents for the region.",
    "Authentic sound capture: the stillness of a snowy place (soft, dead acoustics because snow absorbs sound), distant natural background noise appropriate to the location, then sudden loud real-world sounds with proper attack and decay. The phone's noise suppression subtly pumps after loud sounds. People speak in quick fragments, breathing hard; the animal's sounds are recorded close and raw. No sweeteners, no Foley that does not match the action, no reverb that does not match the space.",
]

QUALITY = (
    "Even if the render is 1080p, it must deliver a premium 4K/8K-grade feel: razor-sharp micro-detail in {tex}; individual snowflakes, ice crystals and spindrift resolved in the air; realistic skin with pores, fine facial hair, cold-reddened cheeks, chapped lips and visible breath vapor; true fabric weave on knit hats, nylon shells, fleece and denim; accurate contact shadows under boots, paws and hooves; natural depth with gentle phone-lens background falloff; clean edges with no oversharpening halos, no smearing, no waxy smoothing and no noise-reduction mush. Lighting is physically motivated by the real sky, sun and practical light sources only, with correct specular highlights on ice and wet surfaces. Targeting Seedance 2.5-level realism through Seedance 2.0."
)

CONT_GENERIC = (
    "Physics must be correct: snow and ice crack, slide and fall with real weight, momentum and debris that scatters and settles; near-freezing water looks dark, heavy and slushy; nothing floats, morphs or reverses. Human anatomy is correct at all times — five fingers per hand, natural joint limits, believable balance, real slips, stumbles and recoveries. Animal behavior is species-accurate in gait, ear and tail signals, vocalizations and reactions; the animal never acts like a trained movie actor or a cartoon. Footprints, paw prints and disturbed snow persist once made. Breath vapor appears with exhales in the cold. Time of day, light direction and weather stay consistent for all 15 seconds."
)

AVOID_GENERIC = (
    "Plastic or waxy skin, airbrushed faces, doll eyes, animated or rubbery bodies, extra or fused fingers, warped limbs, morphing faces, changing outfits, shifting animal markings, CGI-looking snow, fake particle snow, glossy video-game ice, unnatural slow motion, cinematic music, title text, subtitles, watermarks, logos, lens dirt overlays, film grain filters, teal-orange grading, over-saturated colors, drone shots, impossible camera moves, perfect studio lighting, humans or animals floating, objects passing through each other, physics that reverses, professional rescue crews, uniforms, sirens, helicopters, staged hero poses, gore, blood or graphic injury."
)


def parse_file(path):
    stories = []
    for raw in path.read_text(encoding="utf-8").split("\n===")[0:]:
        block = raw.strip().lstrip("=").strip()
        if not block:
            continue
        rec = {"beats": []}
        for line in block.splitlines():
            line = line.strip()
            if not line:
                continue
            if line.startswith("- "):
                rec["beats"].append(line[2:].strip())
                continue
            m = re.match(r"^([A-Z]+):\s*(.*)$", line)
            if not m:
                raise ValueError(f"{path.name}: cannot parse line: {line[:80]}")
            rec[m.group(1)] = m.group(2).strip()
        missing = [f for f in FIELDS if f not in rec]
        if missing:
            raise ValueError(f"{path.name}: story '{rec.get('T','?')}' missing {missing}")
        if len(rec["beats"]) != 15:
            raise ValueError(f"{path.name}: story '{rec['T']}' has {len(rec['beats'])} beats, need 15")
        stories.append(rec)
    return stories


def ts(sec):
    return f"00:{sec:02d}"


def render(i, s):
    fixed = s["CAM"].startswith("FIXED:")
    cam = s["CAM"].replace("FIXED:", "", 1).strip()
    cam_generic = (CAM_FIXED[i % len(CAM_FIXED)] if fixed else CAM_HANDHELD[i % len(CAM_HANDHELD)])
    fps = 60 if i % 4 == 1 else 30
    timeline = "\n".join(
        f"{ts(k)}–{ts(k + 1)} — {beat}" for k, beat in enumerate(s["beats"])
    )
    body = f"""1. FORMAT
Vertical 9:16 smartphone video, 1080x1920, {fps}fps, exactly 15.0 seconds, one continuous real-time take with no cuts, no slow motion, no speed ramps and no transitions. Native in-camera audio only — no music, no voice-over, no captions, no on-screen text, no logos, no watermark. It must read as a real clip filmed by an ordinary person in the moment and posted unedited.

2. LOOK
{s['ENV']} {LOOK_VARIANTS[i % len(LOOK_VARIANTS)]}

3. CAMERA
{cam} {cam_generic}

4. LOCATION
{s['LOC']}

5. CHARACTERS
{s['WHO']} {s['ANI']} Character consistency is locked: faces, body proportions, hairstyles, clothing colors, accessories and the animal's exact markings stay identical from the first frame to the last — no outfit changes, no face drift, no breed or coat changes.

6. HOOK (00:00–00:02)
{s['HOOK']}

7. TIMELINE
{timeline}

8. SOUND DESIGN
{s['SND']} Every sound is diegetic and captured by the phone's built-in microphone from the filming position. Absolutely no music, no score, no risers, no whooshes, no cinematic bass hits.

9. AUDIO REALISM
{AUDIO_VARIANTS[i % len(AUDIO_VARIANTS)]}

10. 4K/8K VISUAL QUALITY ENHANCEMENT
{QUALITY.format(tex=s['TEX'])}

11. REALISM AND CONTINUITY
{s['CONT']} {CONT_GENERIC}

12. AVOID
{AVOID_GENERIC} Also avoid: {s['AV']}"""
    return body


def main():
    stories = []
    for f in sorted(DATA.glob("*.txt")):
        stories.extend(parse_file(f))
    titles = [s["T"] for s in stories]
    dupes = {t for t in titles if titles.count(t) > 1}
    if dupes:
        sys.exit(f"duplicate titles: {dupes}")
    out = [
        "# 150 Winter Nature-Fail Escape Prompts — Seedance 2.0 (15s, 9:16)",
        "",
        "Every prompt: exactly 15 seconds, USA/Canada snow-and-ice locations, a calm natural first second followed by a sudden nature failure, and an escape made possible by an animal or a nearby person. No professional rescues. Each prompt sits in its own code block — use the copy button on the block.",
        "",
        "## Index",
        "",
    ]
    for i, s in enumerate(stories, 1):
        out.append(f"{i}. [{s['T']}](#prompt-{i:03d})")
    out.append("")
    thin = [(i, s["T"]) for i, s in enumerate(stories, 1)
            if sum(len(s[k]) for k in FIELDS) + sum(len(b) for b in s["beats"]) < RAW_MIN]
    if thin:
        sys.exit(f"story-specific detail below {RAW_MIN} chars: {thin}")
    short = []
    for i, s in enumerate(stories, 1):
        body = render(i, s)
        if len(body) < MIN_CHARS:
            short.append((i, len(body)))
        out += [
            f'<a id="prompt-{i:03d}"></a>',
            f"## Prompt {i:03d} — {s['T']}",
            "",
            "```text",
            body,
            "```",
            "",
        ]
    OUT.write_text("\n".join(out), encoding="utf-8")
    lens = [len(render(i, s)) for i, s in enumerate(stories, 1)]
    print(f"stories={len(stories)} min={min(lens)} max={max(lens)} avg={sum(lens)//len(lens)}")
    if short:
        sys.exit(f"too short: {short}")


if __name__ == "__main__":
    main()
