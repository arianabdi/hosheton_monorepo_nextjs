
export function ConvertFilterObjectToUrlParam(obj: any){
    const queryParams: any[] = [];
    Object.keys(obj).forEach(key => {
        queryParams.push(`${key}=${obj[key]}`);
    });
    return queryParams.join('&');
}

