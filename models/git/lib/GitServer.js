

function error(methodName) {
    throw new Error(`${methodName} must be implemented!`);
}
class GitServer {
    constructor(type, token) {
        this.type = type;
        this.token = token;
    }

    setToken(token) {
        this.token = token;
    }

    createRepo(name) {
        error('createRepo');
    }

    createOrgRepo(name, login) {
        error('createOrgRepo');
    }

    getRemote() {
        error('getRemote');
    }

    getRepo(login, name) {
       
    }

    getUser() {
        error('getUser');
    }

    getOrg() {
        error('getOrg');
    }

    getSSHKeyUrl() {
        error('getSSHKeyUrl');
    }


    getTokenHelpUrl() {
        error('getTokenHelpUrl');
    }

    isHttpResponse (response) {
        return response && response.status && response.status === 404;
    }

    handleResponse = (response) => {
        if(this.isHttpResponse(response) && response !== 200) {
            return null;
        } else {
            return response;
        }
    }
}

module.exports = GitServer;