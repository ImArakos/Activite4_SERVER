const Repository = require('../models/Repository');
const Word = require('../models/word');
const CollectionFilter = require('../models/collectionFilter');
const { decomposePath } = require('../utilities');

module.exports = 
class WordsController extends require('./Controller') {
    constructor(req, res){
        super(req, res, false /* needAuthorization */);
        this.wordsRepository = new Repository('Words', true /* cached */);
    }
    error(params, message){
        params["error"] = message;
        this.response.JSON(params);
        return false;
    }

    // GET: api/words
    // GET: api/words?sort=key&key=value....
    get(){
        let params = this.getQueryStringParams(); 
        // if we have no parameter, expose the list of possible query strings
        if (params === null) {
            this.response.JSON(this.wordsRepository.getAll());
        }
        else {
            if (Object.keys(params).length === 0) {
                this.queryStringHelp();
            } else {
                let collectionFilter = new CollectionFilter(this.wordsRepository.getAll(), params);
                this.response.JSON(collectionFilter.get());
            }
        }
    }
}