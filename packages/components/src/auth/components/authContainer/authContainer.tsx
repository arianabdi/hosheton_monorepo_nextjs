import styles from "./authContainer.module.scss"


export function AuthContainer({...props}){
    return(
        <div {...props} className={styles.container}>
            {props.children}
        </div>
    )
}
