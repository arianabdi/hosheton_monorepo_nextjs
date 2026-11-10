import Image from 'next/image';
import Link from 'next/link';
import styles from './blog.module.scss';

export default function HomePage() {
    return (
        <div className={styles.container}>
            {/* هدر سایت */}
            <header className={styles.header}>
                <Link href="/" className={styles.logo}>
                    abdz.
                </Link>
                <nav>
                    <ul className={styles.nav}>
                        <li><Link href="/">home</Link></li>
                        <li><Link href="/tutorials">tutorials</Link></li>
                        <li><Link href="/collections">collections</Link></li>
                        <li><Link href="/more">more</Link></li>
                    </ul>
                </nav>
                <div className={styles.actions}>
                    <Link href="/subscribe" className={styles.subscribe}>subscribe</Link>
                    <div className={styles.searchWrapper}>
                        <input type="text" placeholder="Search" />
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                </div>
            </header>

            {/* بخش اصلی صفحه */}
            <main className={styles.mainContent}>
                {/* ستون سمت چپ: پست ویژه (Featured Post) */}
                <section className={styles.featuredPost}>
                    <div className={styles.category}>ux</div>
                    <h1 className={styles.title}>
                        Ive.One – UX for a fintech platform on Digitization
                    </h1>
                    <div className={styles.imageContainer}>
                        <Image
                            src="/images/featured.jpg"
                            alt="Ive.One UX Fintech Platform"
                            fill
                            priority
                        />
                    </div>
                </section>

                {/* ستون سمت راست: مقالات اخیر (Recent Posts) */}
                <section className={styles.recentSection}>
                    <h2 className={styles.sectionTitle}>recent posts</h2>
                    <div className={styles.postList}>
                        {/* پست اول */}
                        <article className={styles.postCard}>
                            <div className={styles.postInfo}>
                                <span className={styles.postCategory}>branding</span>
                                <Link href="#" className={styles.postTitle}>
                                    Kocbek Branding and Packaging Design
                                </Link>
                                <p className={styles.postSnippet}>
                                    Kocbek approached Visual Brain Gravity with an extraordinary problem. How to push his renowned pumpkin seed oil to...
                                </p>
                            </div>
                            <div className={styles.postThumb}>
                                <Image
                                    src="/images/post-1.jpg"
                                    alt="Kocbek Branding"
                                    fill
                                />
                            </div>
                        </article>

                        {/* پست دوم */}
                        <article className={styles.postCard}>
                            <div className={styles.postInfo}>
                                <span className={styles.postCategory}>3d</span>
                                <Link href="#" className={styles.postTitle}>
                                    Alignment to Air - Motion Design & Typography
                                </Link>
                                <p className={styles.postSnippet}>
                                    As personal experimental projects, when starting with the alphabet "A" for the typography animation, J2Motion(Jin...
                                </p>
                            </div>
                            <div className={styles.postThumb}>
                                <Image
                                    src="/images/post-2.jpg"
                                    alt="Alignment to Air"
                                    fill
                                />
                            </div>
                        </article>
                    </div>
                </section>
            </main>
        </div>
    );
}