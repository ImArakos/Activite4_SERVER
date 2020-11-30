const utilities = require("../utilities");
const serverVariables = require("../serverVariables");
const { v1: uuidv1 } = require('uuid');
const fs = require('fs');
const collectionFilter = require("./collectionFilter");
///////////////////////////////////////////////////////////////////////////
// This class provide CRUD operations on JSON objects collection text file 
// with the assumption that each object have an Id member.
// If the objectsFile does not exist it will be created on demand.
// Warning: no type and data validation is provided
///////////////////////////////////////////////////////////////////////////

let repositoryEtags = {};
let repositoryCache = [];

let RepositoryExpirationTime = serverVariables.get("main.repository.expirationTime");

class Repository {
    constructor(objectsName, cached) {
        this.objectsName = objectsName.toLowerCase();
        this.objectsList = [];
        this.objectsFile = `./data/${objectsName}.json`;
        this.initEtag();
        this.read();
        this.cached = cached;
    }

    initEtag() {
        this.ETag = "";
        if (this.objectsName in repositoryEtags)
            this.ETag = repositoryEtags[this.objectsName];
        else
            this.newETag();
    }

    newETag(){
        this.ETag = uuidv1();
        repositoryEtags[this.objectsName] = this.ETag;
    }

    read() {
        try{
            // Here we use the synchronus version readFile in order  
            // to avoid concurrency problems
            let rawdata = fs.readFileSync(this.objectsFile);
            // we assume here that the json data is formatted correctly
            if(this.cached){
                Repository.clear(this.objectsName);
                Repository.addRepository(this.objectsName, JSON.parse(rawdata));
            }
            this.objectsList = JSON.parse(rawdata);
        } catch(error) {
            if (error.code === 'ENOENT') {
                // file does not exist, it will be created on demand
                this.objectsList = [];
            }
        }
    }
    write() {
        // Here we use the synchronus version writeFile in order
        // to avoid concurrency problems  
        this.newETag();
        fs.writeFileSync(this.objectsFile, JSON.stringify(this.objectsList));
        this.read();
    }
    nextId() {
        let maxId = 0;
        for(let object of this.objectsList){
            if (object.Id > maxId) {
                maxId = object.Id;
            }
        }
        return maxId + 1;
    }
    add(object) {
        try {
            object.Id = this.nextId();
            this.objectsList.push(object);
            this.write();
            return object;
        } catch(error) {
            return null;
        }
    }
    getAll() {
        if(Repository.find(this.objectsName)){
            return Repository.find(this.objectsName);
        }
        this.read();
        return this.objectsList;
    }
    get(id){
        for(let object of this.objectsList){
            if (object.Id === id) {
               return object;
            }
        }
        return null;
    }
    remove(id) {
        let index = 0;
        for(let object of this.objectsList){
            if (object.Id === id) {
                this.objectsList.splice(index,1);
                this.write();
                return true;
            }
            index ++;
        }
        return false;
    }
    removeByIndex(indexToDelete){
        utilities.deleteByIndex(this.objectsList, indexToDelete);
        this.write();
    }
    update(objectToModify) {
        let index = 0;
        for(let object of this.objectsList){
            if (object.Id === objectToModify.Id) {
                this.objectsList[index] = objectToModify;
                this.write();
                return true;
            }
            index ++;
        }
        return false;
    } 
    findByField(fieldName, value){
        let index = 0;
        for(let object of this.objectsList){
            try {
                if (object[fieldName] === value) {
                    return this.objectsList[index];
                }
                index ++;
            } catch(error) {
                break;
            }
        }
        return null;
    }


    static addRepository(name, content) {
        repositoryCache.push({name, content, expireIn: utilities.nowInSeconds() + RepositoryExpirationTime});
        console.log("ADDED IN REPOSITORY");
    }
    static find(name) {
        try {
            if (name != "") {
                for(let endpoint of repositoryCache){
                    if (endpoint.name == name) {
                        // renew cache
                        endpoint.expireIn = utilities.nowInSeconds() + RepositoryExpirationTime;
                        console.log("RETRIEVED FROM REPOSITORY"); 
                        return endpoint.content;
                    }
                }
            }
        } catch(error) {
            console.log("repository cache error", error);
        }
        return null;
    }
    static clear(name) {
        if (name != "") {
            let indexToDelete = [];
            let index = 0;
            for(let endpoint of repositoryCache){
                if (endpoint.name.indexOf(name) > -1) indexToDelete.push(index);
                index ++;
            }
            utilities.deleteByIndex(repositoryCache, indexToDelete);
        }
    }
    static flushExpired() {
        let indexToDelete = [];
        let index = 0;
        let now = utilities.nowInSeconds();
        for(let endpoint of repositoryCache){
            if (endpoint.expireIn < now) {
                console.log("Cached in Repository ", endpoint.name + " expired");
                indexToDelete.push(index);
            }
            index ++;
        }
        utilities.deleteByIndex(repositoryCache, indexToDelete);
    }
}

// periodic cleaning of expired cached GET request
setInterval(Repository.flushExpired, RepositoryExpirationTime);
module.exports = Repository;