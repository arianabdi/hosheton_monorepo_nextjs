import styles from './authCard.module.scss'

export function AuthCard({...props}){
    return(
        <div {...props} className={styles.card}>
            {props.children}
        </div>
    )
}


export function AuthCardHeading({...props}){

    return(
        <div {...props} className={styles.heading}>
            {props.children}
        </div>
    )
}
export function AuthCardTitle({...props}){

    return(
        <h4 {...props} className={styles.title}>
            {props.children}
        </h4>
    )
}
export function AuthCardSubTitle({...props}){

    return(
        <p {...props} className={styles.subtitle}>
            {props.children}
        </p>
    )
}
