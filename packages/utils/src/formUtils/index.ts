import axios from "axios";

export class FormUtils {
  static async loadOptionsFromApi(
    auth: { token?: string },
    path: string,
    key: string,
    chooseOptionsLabelFrom: string,
    chooseOptionsValueFrom: string,
  ) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_API_URL;
      const res = await axios.get(`${apiUrl}${path}`, {
        headers: {
          authorization: `Bearer ${auth.token}`,
        },
      });

      if (res.data.statusCode === 200) {
        return res.data.data[key].map((item: Record<string, string>) => ({
          label: item[chooseOptionsLabelFrom],
          value: item[chooseOptionsValueFrom],
        }));
      }
    } catch (e) {
      console.log("Error: ", e);
    }
  }
}
