'use client'

import {useState} from 'react';
import styles from './Masonry.module.scss';
import {FiSave} from "react-icons/fi";
import {IoBookmarkSharp} from "react-icons/io5";
import {LiaBookmarkSolid} from "react-icons/lia";

// دیتای تست متناسب با نیازمندی‌های پروژه‌های هوش مصنوعی
const SAMPLE_DATA = [
    {
        id: 1,
        type: 'image',
        mediaUrl: 'https://picsum.photos/400/600?random=1', // عمودی بلند
        isWorkflow: true,
        prompt: 'Hyper-realistic cyberpunk city, neon lights, driving rain, cinematic lighting, 8k resolution, Unreal Engine 5 render, detailed reflections on the asphalt, atmospheric volumetric fog.',
        creator: {name: 'Sina_AI', avatar: 'https://picsum.photos/50/50?random=1'},
        models: ['Midjourney v6', 'Magnific AI', 'Magnific AI', 'Magnific AI', 'Magnific AI']
    },
    {
        id: 2,
        type: 'video',
        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        isWorkflow: false,
        prompt: 'A cute fluffy creature bouncing through a magical vibrant forest, Pixar style, shallow depth of field, 3d animation.',
        creator: {name: 'Sara.Art', avatar: 'https://picsum.photos/50/50?random=2'},
        models: ['Sora', 'Runway Gen-3']
    },
    {
        id: 3,
        type: 'image',
        mediaUrl: 'https://picsum.photos/400/300?random=3', // افقی کوتاه
        isWorkflow: true,
        prompt: 'Minimalist architectural design, brutalist concrete villa integrated into a cliffside overlooking the Aegean sea at sunset.',
        creator: {name: 'Alex_Arch', avatar: 'https://picsum.photos/50/50?random=3'},
        models: ['Stable Diffusion XL', 'ControlNet']
    },
    {
        id: 4,
        type: 'image',
        mediaUrl: 'https://picsum.photos/400/700?random=4', // خیلی بلند
        isWorkflow: false,
        prompt: 'Dark fantasy dark knight standing on a mountain of skulls, dramatic low-key lighting, intricate filigree armor, glowing red eyes, oil painting style by Frank Frazetta.',
        creator: {name: 'Reza_AI', avatar: 'https://picsum.photos/50/50?random=4'},
        models: ['Flux.1 Pro']
    },
    {
        id: 5,
        type: 'image',
        mediaUrl: 'https://picsum.photos/400/400?random=5', // مربع
        isWorkflow: true,
        prompt: 'Retro-futuristic vaporwave astronaut drinking coffee on the moon, 1980s anime style, pastel colors, grainy aesthetic.',
        creator: {name: 'NeonDreamer', avatar: 'https://picsum.photos/50/50?random=5'},
        models: ['Midjourney v6', 'ComfyUI']
    },
    {
        id: 6,
        type: 'image',
        mediaUrl: 'https://picsum.photos/400/650?random=6',
        isWorkflow: false,
        prompt: 'Macro photography of a mechanical biological beetle, intricate gears visible under translucent wings, glowing sapphire accents, studio lighting.',
        creator: {name: 'CyberNature', avatar: 'https://picsum.photos/50/50?random=6'},
        models: ['Stable Diffusion 3']
    },
    {
        id: 7,
        type: 'image',
        mediaUrl: 'https://picsum.photos/400/350?random=7',
        isWorkflow: true,
        prompt: 'An ancient mystical library with books floating in mid-air, golden sunbeams piercing through large gothic windows, dust motes dancing in the light.',
        creator: {name: 'Wizard_Prompt', avatar: 'https://picsum.photos/50/50?random=7'},
        models: ['Leonardo AI']
    },
    {
        id: 8,
        type: 'video',
        mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        isWorkflow: true,
        prompt: 'Time-lapse of a futuristic bioluminescent flower blooming in an alien jungle, shifting colors from deep purple to neon cyan, cinematic macro shot.',
        creator: {name: 'Motion_AI', avatar: 'https://picsum.photos/50/50?random=8'},
        models: ['Luma Dream Machine', 'ComfyUI']
    },
    {
        id: 9,
        type: 'image',
        mediaUrl: 'https://picsum.photos/400/550?random=9',
        isWorkflow: false,
        prompt: 'Portrait of an old nomadic wanderer, deeply wrinkled face telling a thousand stories, intense piercing green eyes, photographic masterpiece, national geographic style.',
        creator: {name: 'PhotoReal_King', avatar: 'https://picsum.photos/50/50?random=9'},
        models: ['Flux.1 Schnell']
    },
    {
        id: 10,
        type: 'image',
        mediaUrl: 'https://picsum.photos/400/800?random=10', // بسیار بلند
        isWorkflow: true,
        prompt: 'Infinite vertical city inspired by Tsutomu Nihei\'s Blame!, massive industrial megastructures, tiny human figure walking on a lonely bridge, overwhelming scale, cyberpunk, dark ambient.',
        creator: {name: 'Megastructure', avatar: 'https://picsum.photos/50/50?random=10'},
        models: ['Stable Diffusion XL', 'AnimateDiff']
    },
    {
        id: 11,
        type: 'image',
        mediaUrl: 'https://picsum.photos/400/450?random=11',
        isWorkflow: false,
        prompt: '3D claymation style isometric cozy bedroom, warm lighting, cute tiny details, miniature art, loopable aesthetic, octane render.',
        creator: {name: 'ClayCraft', avatar: 'https://picsum.photos/50/50?random=11'},
        models: ['Midjourney v6']
    },
    {
        id: 12,
        type: 'image',
        mediaUrl: 'https://picsum.photos/400/300?random=12',
        isWorkflow: false,
        prompt: 'Abstract representation of human consciousness merging with artificial intelligence, exploding neural networks, liquid gold and marble textures, surrealism.',
        creator: {name: 'MindPalace', avatar: 'https://picsum.photos/50/50?random=12'},
        models: ['DALL-E 3']
    },
    {
        id: 13,
        type: 'video',
        mediaUrl: 'https://www.w3schools.com/html/movie.mp4',
        isWorkflow: true,
        prompt: 'FPV drone shot diving down a massive snowy mountain peak, high speed, adrenaline, realistic snow physics, sunny day with bright lens flare.',
        creator: {name: 'Fly_AI', avatar: 'https://picsum.photos/50/50?random=13'},
        models: ['Kling AI', 'Stable Video Diffusion']
    },
    {
        id: 14,
        type: 'image',
        mediaUrl: 'https://picsum.photos/400/620?random=14',
        isWorkflow: true,
        prompt: 'Steampunk laboratory filled with bubbling glass flasks, brass pipes, clockwork mechanisms, a glowing plasma globe in the center, dark academia aesthetic.',
        creator: {name: 'SteamPunk_Lab', avatar: 'https://picsum.photos/50/50?random=14'},
        models: ['Midjourney v6', 'ControlNet']
    },
    {
        id: 15,
        type: 'image',
        mediaUrl: 'https://picsum.photos/400/500?random=15',
        isWorkflow: false,
        prompt: 'A majestic white stag with glowing blue antlers walking through a fog-covered mystical Scandinavian forest, Nordic mythology, ethereal vibe.',
        creator: {name: 'NorseMyth', avatar: 'https://picsum.photos/50/50?random=15'},
        models: ['Flux.1 Dev']
    }
];

export default function MasonryList() {
    const [favorites, setFavorites] = useState<any[]>([]);
    const [expandedPrompts, setExpandedPrompts] = useState<any[]>([]);

    // مدیریت لایک / علاقه‌مندی‌ها
    const toggleFavorite = (id: any) => {
        setFavorites(prev =>
            prev.includes(id) ? prev.filter(favId => favId !== id) : [...prev, id]
        );
    };

    // مدیریت باز و بسته شدن متن پرامپت با کلیک
    const togglePrompt = (id: any) => {
        setExpandedPrompts(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.masonryGrid}>
                {SAMPLE_DATA.map((item) => {
                    const isFav = favorites.includes(item.id);
                    const isExpanded = expandedPrompts.includes(item.id);

                    return (
                        <div key={item.id} className={styles.aiCard}>

                            {/* بخش مدیا (عکس یا فیلم) */}
                            <div className={styles.mediaWrapper}>
                                {item.type === 'video' ? (
                                    <video src={item.mediaUrl} className={styles.media} controls muted loop
                                           playsInline/>
                                ) : (
                                    <img src={item.mediaUrl} alt="AI Generated" className={styles.media}
                                         loading="lazy"/>
                                )}

                                <div className={styles.itemTop}>
                                    {/* نشان‌های Overlay */}
                                    <div className={styles.badgesOverlay}>
                                        <span className={`${styles.badge} ${styles.fileType}`}>{item.type}</span>
                                        {item.isWorkflow &&
                                            <span className={`${styles.badge} ${styles.workflow}`}>Workflow</span>}
                                    </div>

                                    {/* دکمه افزودن به علاقه‌مندی‌ها */}
                                    <button className={styles.favoriteBtn} onClick={() => toggleFavorite(item.id)}
                                            aria-label="Favorite">

                                        {
                                            !isFav ?
                                            <LiaBookmarkSolid size={34}/> :
                                            <IoBookmarkSharp  size={34} className={styles.isFavorite} />
                                        }
                                    </button>
                                </div>

                            </div>

                            {/* محتوای کارت */}
                            <div className={styles.cardContent}>

                                {/* پرامپت با افکت Expand/Fade */}
                                <div
                                    className={`${styles.promptContainer} ${isExpanded ? styles.expanded : ''}`}
                                    onClick={() => togglePrompt(item.id)}
                                    title="Click to expand/collapse prompt"
                                >
                                    <p className={styles.promptText}>{item.prompt}</p>
                                </div>

                                {/* فوتر شامل سازنده و مدل‌ها */}
                                <div className={styles.cardFooter}>
                                    <div className={styles.creatorInfo}>
                                        <img src={item.creator.avatar} alt={item.creator.name}
                                             className={styles.avatar}/>
                                        <span className={styles.name}>{item.creator.name}</span>
                                    </div>
                                </div>


                                <div className={styles.modelsList}>
                                    {item.models.map((model, index) => (
                                        <span key={index} className={styles.modelBadge}>{model}</span>
                                    ))}
                                </div>
                            </div>

                        </div>
                    );
                })}
            </div>
        </div>
    );
}