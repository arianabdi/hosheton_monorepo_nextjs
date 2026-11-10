import styles from './helpers.module.scss'
import React from "react";

export function extractHeadings(htmlString) {
    const container = document.createElement('div');
    container.innerHTML = htmlString;

    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');

    return [...headings].map((h, index) => {
        const text = h.textContent.trim();
        const tag = h.tagName.toLowerCase();

        if (!text) return null;

        return (
            <div key={index} className={styles.headingItem}>
                <div>{text}</div>
                <div>{tag}</div>
            </div>
        );
    });
}


export function extractLinksWithType(links, domain) {
    console.log('links', links)

    if(!links)
        return ;

    return (
        <div className={styles.linkContainer}>
            دامنه اصلی: {domain}
            {links?.map((item, index) => {
                const isInternal = item.link.includes(domain) || item.link.startsWith("/") || item.link.startsWith("#");

                return (
                    <div key={index} className={styles.linkItem}>

                        <div className={styles.linkRow}>
                            -
                            <div className={styles.linkInfo}>
                                <a href={item.link} target="_blank" rel="noopener noreferrer" className={styles.linkText}>
                                    {item.text}
                                </a>
                                <span>{item.link}</span>
                            </div>
                        </div>
                        <p>
                            نوع لینک: {isInternal ? "داخلی" : "خارجی"}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

export function extractImagesAndAlts(imageData) {

    return (
        <div className={styles.imageAltContainer}>
            {
                imageData.map((img, index) => {
                    return (
                        <div key={index} className={styles.imageAltItem}>
                            <img src={img.src} alt={img.alt} style={{maxWidth: "100px"}}/>
                            <p>متن Alt: {img.alt || "ندارد"}</p>
                        </div>
                    )
                })
            }
        </div>
    );
}

export function extractKeywordDensity(keywordDensityResult, metaDescriptionContainsKeyword) {
    console.log('keywordDensityResult', keywordDensityResult)
    if(!keywordDensityResult)
        return ;

    return (
        <div className={styles.imageAltContainer}>
            {
                keywordDensityResult.map((item, index) => {
                    return (
                        <ul key={index} className={styles.keywordContainer}>
                            <li className={styles.keywordInfo}>
                                <div className={styles.keywordLine} >

                                    <h6>{item.keyword}</h6>
                                     تکرار: {item.count} بار
                                    — چگالی: {item.density}%
                                </div>

                                <div className={styles.removeUselessKeywords}>
                                    {
                                        item.density > 0 ? "" : "به نظر میرسد این کلید واژه کاربردی در متن شما ندارد پس بهتر است که آن را حذف کنید."
                                    }
                                </div>
                                <ul className={styles.keywordTest}>
                                    <li key={index}> -

                                        {item.inMetaDescription ? (
                                            <span className="text-green-600 font-bold ml-2">✅</span>
                                        ) : (
                                            <span className="text-red-600 font-bold ml-2">❌</span>
                                        )}
                                        کلمه <strong>[{item.keyword}]</strong> در متا:
                                        {item.inMetaDescription ? (
                                            <span className="text-green-600 font-bold ml-2">موجود است </span>
                                        ) : (
                                            <span className="text-red-600 font-bold ml-2">موجود نیست </span>
                                        )}
                                    </li>
                                   {/* <li key={index}> -
                                        کلمه <strong>{item.keyword}</strong> در url:
                                        {item.inUrl ? (
                                            <span className="text-green-600 font-bold ml-2">موجود است ✅</span>
                                        ) : (
                                            <span className="text-red-600 font-bold ml-2">موجود نیست ❌</span>
                                        )}
                                    </li>*/}
                                    <li key={index}> -

                                        {item.inTitle ? (
                                            <span className="text-green-600 font-bold ml-2">✅</span>
                                        ) : (
                                            <span className="text-red-600 font-bold ml-2">❌</span>
                                        )}
                                        کلمه <strong>[{item.keyword}]</strong> در عنوان صفحه:

                                        {item.inTitle ? (
                                            <span className="text-green-600 font-bold ml-2">موجود است </span>
                                        ) : (
                                            <span className="text-red-600 font-bold ml-2">موجود نیست </span>
                                        )}
                                    </li>
                                    <li key={index}> -

                                        {item.inFirstParagraph ? (
                                            <span className="text-green-600 font-bold ml-2">✅</span>
                                        ) : (
                                            <span className="text-red-600 font-bold ml-2">❌</span>
                                        )}
                                        کلمه <strong>[{item.keyword}]</strong> در پاراگراف اول:
                                        {item.inFirstParagraph ? (
                                            <span className="text-green-600 font-bold ml-2">موجود است </span>
                                        ) : (
                                            <span className="text-red-600 font-bold ml-2">موجود نیست </span>
                                        )}

                                    </li>
                                </ul>
                            </li>
                        </ul>
                    )
                })
            }
        </div>
    );
}