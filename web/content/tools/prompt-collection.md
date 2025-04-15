---
title: Prompt Collection
description: A collection of useful prompts for various purposes
---

## GPT-4o

### CLAY
```json
{   "profile_name": "clay effect",   "background": {     "color": "#transparent",     "glow": false,     "shadow": false   },   "object_backdrop_shadow": false,   "material": {     "type": "clay",     "translucency": "none",     "surface_finish": "matte",     "reflectivity": "low",     "texture_wrapping": true,     "texture_description": "A colorful, playdough-like clay surface with a hand-molded appearance. The texture features slightly rough and uneven edges, subtle fingerprint impressions, and soft variations in height and color. Its surface has a tactile, sculpted feel, mimicking the organic irregularities of real modeling clay. Colors blend naturally but remain distinct, giving a playful, handmade quality."   },   "style": {     "dimensions": "3D",     "contour": "rounded",     "edges": "soft",     "form": "chunky",     "lighting": {       "ambient": true,       "directional": false,       "highlights": "subtle"     },     "geometry": "simplified minimalism",     "depth": "medium"   },   "objects": [     {       "type": "rocket",       "components": ["body", "fins", "window", "flame"],       "style_notes": "smooth integration between parts, exaggerated curves"     },     {       "type": "headphones",       "components": ["earcups", "headband", "microphone arm"],       "style_notes": "inflated look, compact design, soft cushions"     },     {       "type": "folder",       "components": ["main body", "tab"],       "style_notes": "flat yet slightly puffed look, clean top tab"     },     {       "type": "server_stack",       "components": ["stacked units", "indicator lights", "slots"],       "style_notes": "boxy with soft edges, slight spacing between stacks"     },     {       "type": "office_items",       "components": [         "calendar",         "clock",         "radio",         "typewriter",         "plant_pot"       ],       "style_notes": "retro-futuristic forms, rounded retro tech designs, plant with thick leaves"     }   ] }
```

### 1600s
```json
{
  "style": {
    "line_art": {
      "type": "engraved_etching",
      "weight": "heavy",
      "detailing": "hyper-detailed, cross-hatching, stippling, dense in contours and textures",
      "contrast": "extreme between light and shadow"
    },
    "rendering": {
      "depth": "high-relief pseudo-3D",
      "lighting": "dramatic, directional, chiaroscuro-inspired",
      "shading": "textural, scratchy or layered strokes",
      "surface_texture": "appears tactile, almost like metallic or carved wood"
    },
    "composition": {
      "drama": "maximized, dynamic poses, cinematic angles, strong diagonal lines",
      "motion": "implied through flowing garments, hair, and environment",
      "focus": "central characters or objects with intense expressions or actions"
    },
    "anatomy_and_fabric": {
      "musculature": "exaggerated realism, defined anatomy, emotional tension",
      "clothing": "ornate, flowing, patterned, often with intricate embroidery-like detail",
      "hair": "windswept or dynamically posed, textured with line work"
    },
    "icon_elements": {
      "figures": "heroic or mythic scale, often in conflict or divine stance",
      "monsters": "grotesque, baroque, heavily stylized with exaggerated demonic traits",
      "angelic_beings": "elegant, detailed wings, baroque robes, flowing hair",
      "environment": "symbolic and stylized clouds, waves, or celestial motifs"
    },
    "visual_effects": {
      "auras": "etched or engraved light radiance, usually surrounding divine characters",
      "smoke_clouds": "whorled, stylized like brush-and-ink calligraphy",
      "power_lines": "gold foil-like energy lines or divine chains"
    },
    "ornamentation": {
      "style": "baroque-meets-Asian lacquer art, with dense patterning",
      "placement": "frames figures, often appearing as part of armor, weapons, or clouds",
      "texture_emphasis": "metallic-like or textile-inspired flourishes"
    },
    "background": {
      "transparency": true,
      "default_output": "transparent PNG",
      "layers": "foreground characters separated cleanly from background elements",
      "user_choice": "if no background color provided, AI generates complementary tones automatically"
    },
    "color_handling": {
      "custom_colors": "user-defined",
      "auto_palette": "AI-selected if not specified, focusing on contrast and harmony",
      "metallic_effect": "emulated through textured gradients and reflective highlights"
    },
    "output": {
      "format": "PNG",
      "transparency": true,
      "resolution": "high (minimum 1024x1024 for icons)",
      "icon_style": "2D flat-rendered with depth illusion through line work and shading"
    }
  }
}
```

### ILLUSTRATIONS
```json
{
  "style_name": "illustrations_1",
  "background": "#ffffff",
  "linework": {
    "stroke_width": "1px to 3px (context-aware)",
    "stroke_type": "solid",
    "edge_style": "sharp, minimal outlines with graphic cleanliness—like thin pen plots",
    "outline_color": "auto-detect based on palette",
    "stroke_behavior": {
      "thin_lines": "used for general object outlines and fine details (1px–1.5px)",
      "medium_lines": "used for UI blocks, hand edges, device borders (2px)",
      "thick_lines": "used for stylized shadows, motion emphasis, depth outlines (2.5px–3px)"
    }
  },
  "geometry": {
    "base_shapes": [
      "rounded rectangles",
      "perfect circles",
      "simple cubes",
      "sliced cylinders",
      "2D polygonal clusters"
    ],
    "3d_suggestion": "pseudo-3D through clean flat angles and stacked shapes",
    "element_construction": "composed using layered vector forms, minimal intersections"
  },
  "flow": {
    "layout_type": "modular layout with focal character and floating adjacent elements",
    "motion_suggestion": "implied with tilts, staggered element trails, and duplicate outlines",
    "hand_gestures": "fluid stylized hands with modular fingers, vector-gloved look"
  },
  "visual_language": {
    "icons_and_symbols": [
      "coins, cubes, graphs, screens",
      "tech-finance logos (generic UI)",
      "blockchain/crypto logos",
      "basic app UI indicators"
    ],
    "text_elements": "scant use of alphanumeric values; symbols and logos preferred",
    "faces": "when present, use geometric smiley/symbolic eyes"
  },
  "vector_friendly": {
    "shadows": "use line-based or block-filled shadows only",
    "gradients": "never used; use pure flat tones",
    "background": "always white #ffffff",
    "overlapping": "layered cleanly; no blurring or soft overlays"
  },
  "recommended_color_handling": {
    "if_unspecified": "AI chooses a visually appropriate color palette based on context",
    "contrast": "strong contrast between elements; linework always clearly visible",
    "use_case_consistency": "visual cues reflect fintech, AR/VR, or blockchain themes"
  },
  "typical_use_cases": [
    "decentralized finance visuals",
    "AR/VR transactions",
    "crypto dashboards",
    "playful fintech metaphors",
    "NFT and metaverse interactions"
  ]
}
```

### BLOCKY
```json
{
  "style": "3D Pixel Isometric",
  "geometry": {
    "voxel_size": "uniform",
    "blocky_structure": true,
    "isometric_projection": true,
    "edge_softness": "hard",
    "beveling": "none",
    "scale_consistency": "consistent",
    "modular_design": true
  },
  "lighting": {
    "source": "single-directional light",
    "shadow_detail": "none",
    "shadow_casting": "none",
    "highlighting": "soft",
    "ambient_occlusion": "subtle"
  },
  "materials": {
    "texture": "flat colors",
    "surface_reflectivity": "matte",
    "gradient_use": "minimal",
    "color_scheme": {
      "base_palette": ["soft pinks", "warm reds", "off-whites", "forest greens", "cool blues"],
      "accent_colors": ["desaturated pastels", "deep shadows"]
    }
  },
  "background": {
    "color": "transparent",
    "glow": false,
    "shadow_on_background": false,
    "transparent_png_ready": true
  },
  "composition": {
    "layering": "stacked isometric layers",
    "depth_cues": "object scale and placement",
    "focus": "centralized composition",
    "empty_space_usage": "moderate to sparse",
    "clutter_level": "low"
  },
  "rendering": {
    "resolution": "high",
    "pixelation_level": "low-poly voxel",
    "anti_aliasing": "off",
    "outlines": "none",
    "render_engine": "stylized rasterization",
    "output_format": "transparent PNG"
  },
  "animation_ready": {
    "rigging_structure": "voxel-compatible",
    "modularity": true,
    "tiling_compatibility": true
  }
}
```

### Logo
```json
{
  "styleProfiles": {
    "style1": {
      "name": "Geometric High-Contrast Logo Style",
      "description": "A bold, stylized identity system based on angular geometric forms with clean vector edges and high visual contrast. Logos depict animals, creatures, or symbolic figures in white on a black background using refined anchor transitions for smoother lines.",
      "visualCharacteristics": {
        "colorScheme": {
          "background": "#000000",
          "foreground": "#FFFFFF"
        },
        "lineQuality": "Smooth vector transitions between anchor points, no jagged or pixelated edges",
        "edgeStyle": "Angular with softened directional flow; no curves, but paths transition cleanly between points",
        "fillType": "Solid fill (no gradients or outlines)",
        "contrast": "High-contrast black and white",
        "stroke": "None used"
      },
      "subjectMatter": {
        "type": "Animal, Creature, Symbolic Mask",
        "exampleSubjects": [
          "Bison",
          "Elephant",
          "Sloth",
          "Bull",
          "Owl",
          "Crocodile",
          "Oni Mask or Demonic Face"
        ],
        "poseVariety": [
          "Profile (side view) with dynamic stance",
          "Centered symmetrical pose",
          "Mid-action movement (charging, climbing, coiled)"
        ]
      },
      "designDirectives": {
        "geometry": "Use straight edges and triangular/diamond forms as the foundation",
        "balance": "Maintain visual balance between weight and negative space",
        "symmetry": "Used for mask-style or owl-like icons; asymmetry allowed in dynamic animals",
        "sizing": "Fits within a square or circular composition; edge-to-edge minimal margin",
        "anchorSmoothing": "Minimize harsh transitions by adjusting Bezier handles while retaining straight edges"
      },
      "fileGuidelines": {
        "exportFormats": ["SVG", "PNG"],
        "resolution": "Minimum 1024x1024px",
        "background": "Solid black only",
        "transparency": false,
        "vectorCleanliness": "No overlapping paths, optimized points, and consistent anchor spacing"
      },
      "brandingApplication": {
        "usage": "Apparel, digital branding, merchandise, social identity",
        "trademark": "Optional monogram or symbol may be included subtly",
        "exclusivity": "Each figure should feel unique but clearly part of the same visual language"
      },
      "notes": {
        "refinements": "Anchor-to-anchor lines must maintain logical angle progression and avoid abrupt or jagged joins.",
        "styleContinuity": "Maintain geometric precision while allowing for slight expressive exaggeration (horns, eyes, claws, etc.)"
      }
    },
    "style2": {
      "name": "Minimal Geometric Symbol Style",
      "description": "A modular visual identity system built entirely from pure geometric shapes. Designs are highly abstract yet recognizable, forming symbolic representations of animals, masks, and creatures with a blocky, modernist folk aesthetic. The style blends playful construction with stark visual presence.",
      "visualCharacteristics": {
        "colorScheme": {
          "background": "#000000",
          "foreground": "#FFFFFF"
        },
        "lineQuality": "Crisp, clean-cut vector shapes with no strokes, gradients, or curves",
        "edgeStyle": "Perfectly straight geometric edges and angles — no hand-drawn or organic lines",
        "fillType": "Solid fill only (white on black)",
        "contrast": "High-contrast monochrome",
        "stroke": "None"
      },
      "subjectMatter": {
        "type": "Abstract Creatures, Birds, Mythical Beasts, Symbolic Faces",
        "exampleSubjects": [
          "Crab",
          "Owl",
          "Moose",
          "Bear",
          "Raven",
          "Lion Mask",
          "Jester Face",
          "Fantasy Deer",
          "Knight Helmet",
          "Fish",
          "Folk Emblems"
        ],
        "poseVariety": [
          "Perfectly symmetrical front-facing",
          "Stylized side profile",
          "Totemic vertical composition",
          "Emblematic badge-like framing"
        ]
      },
      "designDirectives": {
        "geometry": "Use only base geometric primitives: circles, half/quarter circles, squares, rectangles, diamonds, and triangles (no irregular shapes or bezier curves)",
        "balance": "Maintain visual equilibrium using mirrored layout or radial symmetry; spacing should feel modular and harmonious",
        "symmetry": "Strong use of bilateral or central symmetry; asymmetric compositions are allowed when symbolic or balanced",
        "sizing": "Centered inside a square frame with minimal margin; may touch or nearly touch canvas edges",
        "anchorSmoothing": "None; all lines must originate from or align to clean geometric intersections",
        "goldenRatioLayout": "Incorporate golden ratio proportions in composition and spatial relationships wherever possible; use Phi (1:1.618) to guide sizing, positioning, and element scaling"
      },
      "fileGuidelines": {
        "exportFormats": ["SVG", "PNG"],
        "resolution": "Minimum 1024x1024px",
        "background": "Solid black (#000000)",
        "transparency": false,
        "vectorCleanliness": "All shapes must be snapped to grid/aligned; avoid overlapping unless masked or logically layered"
      },
      "brandingApplication": {
        "usage": "Game branding, NFT icons, tech branding, heritage patterns, story-driven logos",
        "trademark": "No lettering unless integrated with the symbol’s shape logic",
        "exclusivity": "Each mark should feel like part of the same visual dialect, unique but interrelated"
      },
      "notes": {
        "refinements": "Details such as feathers, scales, teeth, or fur should be implied using repeated geometric forms (e.g., stacked triangles, circles)",
        "styleContinuity": "Think in tiles, blocks, and glyphs. Every element should feel deliberately placed like part of a symbol system or constructed language."
      }
    },
    "style3": {
      "name": "Elegant Figurative Silhouette Style",
      "description": "A refined, high-contrast monochrome logo style featuring elegant human or animal figures in dynamic or iconic poses. The visual focus is on smooth, organic contours with stylized facial expressions or symbolic gestures. This style blends minimalism with classical illustration influence.",
      "visualCharacteristics": {
        "colorScheme": {
          "background": "#000000",
          "foreground": "#FFFFFF"
        },
        "lineQuality": "Fluid and graceful, vector-based smooth curves, no visible strokes",
        "edgeStyle": "Mostly curved with deliberate sharp angles at emotional or structural emphasis points (chin, jawline, cheekbones, claws, etc.)",
        "fillType": "Solid white fill on pure black background (no gradients or outlines)",
        "contrast": "Maximum contrast using pure black (#000000) and pure white (#FFFFFF)",
        "stroke": "None"
      },
      "subjectMatter": {
        "type": "Human figure, mythological figure, stylized animal, symbolic representation",
        "exampleSubjects": [
          "Mermaid holding a torch",
          "Lion on crest",
          "Mythological woman with star or crown",
          "Owl with fish",
          "Heroic male bust",
          "Falcon with weapon or medallion"
        ],
        "poseVariety": [
          "Frontal symmetrical",
          "Three-quarter face or body view",
          "Crest or emblem style",
          "Action-ready stance"
        ]
      },
      "designDirectives": {
        "geometry": "Favor flowing lines, hair-like extensions, serpentine curves; occasional use of halos, shields, or arcs to frame composition",
        "balance": "Center-weighted compositions; strong use of negative space to define form",
        "symmetry": "Symmetry used for deity-like presence; asymmetry adds natural or heroic energy",
        "sizing": "Fills the frame but avoids touching edges; logo breathes within a contained layout",
        "anchorSmoothing": "Use extended bezier handles to smooth transitions, especially around faces and limbs"
      },
      "fileGuidelines": {
        "exportFormats": ["SVG", "PNG"],
        "resolution": "Minimum 1024x1024px",
        "background": "#000000",
        "transparency": false,
        "vectorCleanliness": "Optimized paths only; avoid overlaps and extraneous anchor points"
      },
      "brandingApplication": {
        "usage": "Luxury branding, fashion, editorial covers, NFT identities, music branding",
        "trademark": "Distinctive white-on-black silhouette becomes the core brand element",
        "exclusivity": "Each logo must feel regal, mystical, or iconic"
      },
      "notes": {
        "refinements": "Use stylized hair, flowing garments, wings, or feathers to add identity flair",
        "styleContinuity": "Maintain unified silhouette with striking and emotive facial or body language"
      }
    },
    "style4": {
      "name": "Monochrome Vector Mascot Logo Style",
      "description": "A bold, clean, high-contrast mascot style using vector graphics that combine cartoon aesthetics with sharp intensity. Designed to evoke personality, toughness, or cleverness using exaggerated facial features and expressive line work, all in a crisp black-and-white format.",
      "visualCharacteristics": {
        "colorScheme": {
          "background": "#000000",
          "foreground": "#FFFFFF"
        },
        "lineQuality": "Crisp, consistent stroke weight with controlled curves and stylized detail; no pixelation or soft shading",
        "edgeStyle": "Bold, clean outlines with smooth curves and pointed accents (especially around eyes, snouts, horns, and fur)",
        "fillType": "Solid white fill with black background; no gradients or textures",
        "contrast": "Extremely high contrast; only black and white used to emphasize form and silhouette",
        "stroke": "Used strategically to outline shapes, facial features, and emphasize expressions"
      },
      "subjectMatter": {
        "type": "Animal, Anthropomorphic Mascot, Mythic Figure",
        "exampleSubjects": [
          "Duck with fedora",
          "Kangaroo in outback hat",
          "Koala with attitude",
          "Wolf with fierce expression",
          "Oni/Demon mask with horns and tusks"
        ],
        "poseVariety": [
          "Side profile with intense gaze",
          "Three-quarter turn for personality emphasis",
          "Centered, symmetrical stance for demonic or mythic figures"
        ]
      },
      "designDirectives": {
        "geometry": "Use smooth curves and strong silhouettes; apply symmetry for masks and mythic figures, asymmetry for personality mascots",
        "balance": "Maintain equal weight across forms; contrast facial features against the body shape",
        "symmetry": "Important for masks and traditional figures; animal mascots may use slight asymmetry to show character",
        "sizing": "Square layout with the character's head or bust taking central focus; minimal margin",
        "anchorSmoothing": "Bezier curves used for all lines; transitions are fluid and expressive",
        "expressionVariants": {
          "enableFacialExpressionControl": true,
          "expressionTypes": ["happy", "sad", "angry", "focused"],
          "guidelines": "Expression should be inferred from the prompt unless otherwise specified. Modify eyebrow angles, eye shape, and mouth position to reflect emotion while maintaining stylistic consistency."
        }
      },
      "fileGuidelines": {
        "exportFormats": ["SVG", "PNG"],
        "resolution": "Minimum 1024x1024px",
        "background": "Solid black only (#000000)",
        "transparency": false,
        "vectorCleanliness": "No overlapping strokes, consistent line weight, and efficient path construction"
      },
      "brandingApplication": {
        "usage": "Esports logos, apparel, merch branding, social avatars, and gaming mascots",
        "trademark": "Unique silhouette and facial structure help distinguish each mascot or icon",
        "exclusivity": "Each logo must feel like part of the same aesthetic universe but distinct in subject and attitude"
      },
      "notes": {
        "refinements": "Facial expressions are key — exaggerate the eyes, eyebrows, and mouth; hats and accessories are used for added identity",
        "styleContinuity": "All figures must maintain bold black outlines, white fill, high-contrast personality, and consistent curve quality",
        "expressionAdaptation": "Use eye shape (round, slanted, squinted), brow positioning (raised, furrowed), and mouth (smile, frown, snarl) to clearly express emotion."
      }
    }
  }
}

```

### NFT资料图片
```
NFT-style penguin wearing a bucket hat decorated with pins and a red puffer vest. Holding a large swirl lollipop like a staff. Solid light blue background. Minimal, vector-style art for NFT profile pictures
```

### 烹饪食谱卡片


```
Create step-by-step recipe infographic for mushroom pasta, top-down view, minimal style on white background, ingredient photos labeled: "200g spaghetti", "150g mushrooms", "3 garlic cloves", “25g chopped sun-dried tomatoes”, "50g butter", "1 tbsp olive oil", "parmesan", "parsley", dotted lines showing process steps with icons (boiling pot, sauté pan, mixing), final plated pasta shot at the bottom.
```

### 中文诗词手绘卡片

```
生成图像，张9:16竖版手绘信息图表卡，米白/灰白纹理纸背景。标题“醒世三问”，用醒目的红黑撞色、泼墨感中文草书大字书写。包含三个图文错落的主题区，强调手绘感和留白。内容为：1.“执念何所缚?”配解绳简笔画；2.“心镜可明台?”配拭镜简笔画；3.“浮云归处是?”配远山飞鸟简笔画。所有文字为遒劲流畅的中文草书。关键处用朱砂红/墨色点睛。
```

### 创建3D图片

```markdown
Generate a <替换为你要画的东西> with the following JSON profile:

<pre style="caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); font-style: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: auto; text-align: start; text-indent: 0px; text-transform: none; widows: auto; word-spacing: 0px; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto; -webkit-text-stroke-width: 0px; text-decoration: none; overflow-wrap: break-word; white-space: pre-wrap;">{
  "art_style_profile": {
    "style_name": "Minimalist 3D Illustration",
    "visual_elements": {
      "shape_language": "Rounded edges, smooth and soft forms with simplified geometry",
      "colors": {
        "primary_palette": ["Soft beige, light gray, warm orange"],
        "accent_colors": ["Warm orange for focal elements"],
        "shading": "Soft gradients with smooth transitions, avoiding harsh shadows or highlights"
      },
      "lighting": {
        "type": "Soft, diffused lighting",
        "source_direction": "Above and slightly to the right",
        "shadow_style": "Subtle and diffused, no sharp or high-contrast shadows"
      },
      "materials": {
        "surface_texture": "Matte, smooth surfaces with subtle shading",
        "reflectivity": "Low to none, avoiding glossiness"
      },
      "composition": {
        "object_presentation": "Single, central object displayed in isolation with ample negative space",
        "perspective": "Slightly angled, giving a three-dimensional feel without extreme depth",
        "background": "Solid, muted color that complements the object without distraction"
      },
      "typography": {
        "font_style": "Minimalistic, sans-serif",
        "text_placement": "Bottom-left corner with small, subtle text",
        "color": "Gray, low-contrast against the background"
      },
      "rendering_style": {
        "technique": "3D render with simplified, low-poly aesthetics",
        "detail_level": "Medium detail, focusing on form and color over texture or intricacy"
      }
    },
    "purpose": "To create clean, aesthetically pleasing visuals that emphasize simplicity, approachability, and modernity."
  }
}</pre>
```