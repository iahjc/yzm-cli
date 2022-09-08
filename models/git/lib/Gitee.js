const GitServer = require('./GitServer');
const GiteeRequest = require('./GiteeRequest');
// 令牌token 52d8a69c4f06bab1ac215c6bcf05255a
class Gitee extends GitServer {
    constructor() {
        super('Gitee');
        this.request = null;
    }

    setToken(token) {
        super.setToken(token);
        this.request = new GiteeRequest(token);
    }

    createRepo(name) {
        return this.request.post('/user/repos', {
            name
        });
    }

    createOrgRepo(name, login) {
        return this.request.post(`/orgs/${login}/repos`, {
            name
        });
    }

    getRemote(login, name) {
        return `git@gitee.com:${login}/${name}.git`;
    }

    getRepo(login, name) {
        return this.request
            .get(`https://gitee.com/api/v5/repos/${login}/${name}`)
            .then(response => {
                return this.handleResponse(response);
            });
    }

    getUser() {
        return this.request.get('/user').then(response => {
            return response;
        });
    }

    getOrg(username) {
        return this.request.get(`/users/${username}/orgs`, {
            page: 1,
            per_page: 100
        });
    }

    getSSHKeyUrl() {
        return 'https://gitee.com/profile/sshkeys';
    }


    getTokenHelpUrl() {
        return 'https://gitee.com/help/articles/4191'
    }
}

module.exports = Gitee;
