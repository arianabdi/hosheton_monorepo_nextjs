import styles from './logs.module.scss'
export function Logs({theme, token, fullname, font}){
    return(
        <div className={styles.logs}>
            {
                process.env.NODE_ENV === 'development' ?
                    <div>
                        <span>theme: {theme || 'NULL'}</span>
                        <span>token: {token || 'NULL'}</span>
                        <span>fullName: {fullname || 'NULL'}</span>
                        <span>font: {font || 'NULL'}</span>
                    </div>: ''
            }
        </div>
    )
}