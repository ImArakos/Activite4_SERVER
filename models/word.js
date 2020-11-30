module.exports = 
class Word{
    constructor(word, definition)
    {
        this.Id = 0;
        this.Word = word !== undefined ? word : "";
        this.Definition = definition !== undefined ? definition : "";
    }

    static valid(instance) {
        const Validator = new require('./validator');
        let validator = new Validator();
        validator.addField('Id','integer');
        validator.addField('Word','string');
        validator.addField('Definition','url');
        return validator.test(instance);
    }
}