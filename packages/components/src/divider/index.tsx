import styles from './divider.module.scss'


export function Divider(){
    return(
        <div className={styles.divider}>
            <div className={styles.line}></div>
        </div>
    )
}