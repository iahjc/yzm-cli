const axios = require('axios');
const BASE_URL = 'https://gitee.com/api/v5';

class GithubRequest {
    constructor(token) {
        this.token = token;
        this.server = axios.create({
            baseURL: BASE_URL,
            timeout: 5000
        });
        this.server.interceptors.response.use(
            response => {
                return response.data;
            },
            error  => {
                if(error.response && error.response.data) {
                    return error.response;
                } else {
                    return Promise.reject(error);
                }
            }
        )
    }

    get(url, params, headers) {
        return this.server({
            url,
            params: {
                ...params,
                access_token: this.token,
            },
            headers
        })
    }
}

module.exports = GiteeRequest;