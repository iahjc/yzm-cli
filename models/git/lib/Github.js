const GitServer = require('./GitServer');

class Github extends GitServer {
    constructor() {
        super('github');
    }

    setToken() {
        
    }

    createRepo() {
      
    }

    createOrgRepo() {
        
    }

    getRemote() {
       
    }

    getUser() {
       
    }

    getOrg() {
       
    }

    getSSHKeyUrl() {
       return 'https://github.com/settings/keys';
    }


    getTokenHelpUrl() {
        return 'https://docs.github.com/en/github'
    }
}

module.exports = Github;
