


export function toFarsiNumber(n: any) {
    const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return !n ? '' : n.toString().replace(/\d/g, (x: any) => farsiDigits[x]);
}
export function objectToFarsiNumber(object: any) {
    let newObject: any = {};
    if(object)
        Object.keys(object).map(itm => {

            if(typeof object[itm] === "object"){
                return newObject[itm]=objectToFarsiNumber(object[itm])
            }


            return newObject[itm]=toFarsiNumber(object[itm])
        })

    return newObject;
}
