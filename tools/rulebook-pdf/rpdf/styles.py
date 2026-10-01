"""Style presets: an image-prompt suffix plus matching layout accent colors."""

PRESETS = {
    "Anime Action (KINETIK)": {
        "style": "cinematic anime action illustration, rain-soaked neon city, dark gritty atmosphere, "
                 "bold inked linework, cel shading, extreme high contrast, magenta and cyan rim light, "
                 "wide cinematic composition, masterpiece, best quality",
        "accent": "#2fe6ff", "accent2": "#ff2f92",
    },
    "Film Noir": {
        "style": "film noir illustration, black and white with deep shadows, venetian blind light, "
                 "cigarette smoke, 1940s, chiaroscuro, high contrast ink, grainy, dramatic low angle, "
                 "masterpiece, best quality",
        "accent": "#e8e4d8", "accent2": "#c0392b",
    },
    "Dark Fantasy": {
        "style": "dark fantasy oil painting, muted earthy colors, dramatic candle and torch light, "
                 "gothic atmosphere, painterly brushwork, detailed armor and cloth, fog, "
                 "masterpiece, best quality",
        "accent": "#d4a35a", "accent2": "#a8322d",
    },
    "Klassische Fantasy (Aquarell)": {
        "style": "classic fantasy rulebook illustration, ink and watercolor, warm parchment tones, "
                 "soft natural light, detailed linework, storybook atmosphere, masterpiece, best quality",
        "accent": "#e0b062", "accent2": "#5fa36b",
    },
    "Comic / Graphic Novel": {
        "style": "american comic book art, bold black ink outlines, flat saturated colors, halftone dots, "
                 "dynamic foreshortening, speed lines, graphic novel panel composition, masterpiece",
        "accent": "#ffd23f", "accent2": "#ee4266",
    },
    "Cyberpunk": {
        "style": "cyberpunk concept art, neon signage glow, holographic haze, chrome and wet asphalt "
                 "reflections, teal and purple palette, volumetric fog, highly detailed, masterpiece",
        "accent": "#00f0ff", "accent2": "#b14aed",
    },
    "Sci-Fi Concept Art": {
        "style": "hard science fiction concept art, matte painting, vast scale, clean industrial design, "
                 "cold blue lighting with orange accents, cinematic, highly detailed, masterpiece",
        "accent": "#6ec6ff", "accent2": "#ff8a3d",
    },
    "Gothic Horror": {
        "style": "gothic horror illustration, desaturated palette with blood red accents, moonlight, "
                 "heavy shadows, unsettling atmosphere, etching-like linework, masterpiece, best quality",
        "accent": "#c9c3b6", "accent2": "#b3121b",
    },
    "Retro Pulp (50er)": {
        "style": "1950s pulp magazine cover art, gouache painting, saturated retro colors, heroic poses, "
                 "dramatic lighting, vintage print texture, masterpiece",
        "accent": "#ffcf56", "accent2": "#e4572e",
    },
    "Sumi-e / Tusche": {
        "style": "japanese sumi-e ink wash painting, expressive brush strokes, rice paper texture, "
                 "minimal red accent color, negative space, elegant motion, masterpiece",
        "accent": "#e8e1d3", "accent2": "#c8102e",
    },
}

CUSTOM = "Eigener Stil"


def model_hint(comfy_cfg):
    """Tell agy what kind of prompt the selected image model understands."""
    kind = comfy_cfg.get("workflow", "anima")
    name = (comfy_cfg.get("unet") if kind == "anima" else comfy_cfg.get("checkpoint")) or ""
    low = name.lower()
    if kind == "anima" or any(k in low for k in ("anima", "illustrious", "noob", "pony", "animagine")):
        return (f"Image model: {name or 'anime model'} (anime-focused; understands Danbooru-style tags, "
                "artist and franchise names as tags, and short natural-language phrases).")
    if "flux" in low or "qwen" in low:
        return f"Image model: {name} (understands detailed natural-language descriptions)."
    return f"Image model: {name or 'Stable Diffusion checkpoint'} (works best with comma-separated tags)."
