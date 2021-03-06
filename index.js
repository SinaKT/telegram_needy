var needmanager = require('needmanager');
var Bot = require('node-telegram-bot-api');

var tgneedy = function(options){
    var opts = options || {};
    this.opts = opts;
    if(!this.opts.sid)
        this.opts.sid = 'sid';
    needmanager.call(this, opts);
    if(opts.token){
        this.bot = new Bot(opts.token, {polling: true});
        opts.bot = this.bot;
    } else {
        this.bot = opts.bot;
    }

    this.base.options = opts;

    var oldEmit = this.bot.emit;
    var self = this;
    this.bot.emit = function(eventName, eventData){
        if( typeof eventData.chat !== 'undefined'){
            self.invoke(eventData.chat.id, eventName, eventData);
        } else if(typeof eventData.user !== 'undefined'){
            self.invoke(eventData.user.id, eventName, eventData);
        }
        oldEmit.call(self.bot, eventName, eventData); 
    }

    var Need = this.Need;
    var Send = function(config){
        if(!config.name)
            throw "ERR: No name was assigned";
        if(!config.text)
            throw "ERR: No text was assigned";

        for(var i in config)
            this[i] = config[i];

        var _post = config.post;
        this.post = function(inputs){
            var opts = this.options;
            opts.bot.sendMessage(inputs[opts.sid], config.text);
            if(_post)
                _post.cal(this, inputs);
            else
                this.done();
        }
    }

    Need.Send = Send;

    this.register(new Need({
        name: "_input#text",
        post: function(inputs){
            this.wait();
        },
        invokers: [
            {
                event: "text",
                callback: function(inputs, data){
                    this.done(data.text);
                }
            }
        ]
    }))

    var Ask = function(config){
        if(!config.name)
            throw "ERR: No name was assigned";
        if(!config.text)
            throw "ERR: No text was assigned";

        for(var i in config)
            this[i] = config[i];

        this.req = config.req || [];
        this.req.push('_input#text');

        var _pre = config.pre;
        this.pre = function(inputs){
            this.sys.forget('_input#text');
            var opts = this.options;
            opts.bot.sendMessage(inputs[opts.sid], config.text);
            if(_pre){
                _pre.call(this, inputs);
            } else {
                this.ok();
            }
        }

        var _post = config.post;
        this.post = function(inputs){
            var ans = inputs['_input#text'];
            this.sys.forget('_input#text');
            if(_post){
                _post.call(this, inputs, ans);
            } else {
                this.done(ans);
            }
        }
    }
    Need.Ask = Ask;
    
    var Choose = function(config){
        if(!config.name)
            throw "ERR: No name was assigned";
        if(!config.text)
            throw "ERR: No text was assigned";
        if(!config.options)
            throw "ERR: No options was assigned";

        for(var i in config)
            this[i] = config[i];

        this.req = config.req || [];
        this.req.push('_input#text');
        
        var _pre = config.pre;
        this.pre = function(inputs){
            this.sys.forget('_input#text');
            var opts = this.options;
            var keyboard = [];
            for (var i in config.options){
                // TODO make 2 optional?
                if (i % 2 == 0){
                    keyboard.push([{text: config.options[i]}]);
                } else {
                    keyboard[keyboard.length - 1].push({text: config.options[i]});
                }
            }
            opts.bot.sendMessage(inputs[opts.sid], config.text, {reply_markup: {
                keyboard: keyboard
            }});
            if(_pre){
                _pre.call(this, inputs);
            } else {
                this.ok();
            }
        }

        var _post = config._post;
        this.post = function(inputs){
            var ans = inputs['_input#text'];
            this.sys.forget('_input#text');

            if (config.options.indexOf(ans) === -1){
                // TODO a better option?
                this.sys.triggers[config.name].pre_done = false;
                return this.ok();
            }

            if(_post){
                _post.call(this, inputs, ans);
            } else {
                this.done(ans);
            }
        }
    }

    Need.Choose = Choose;
}

tgneedy.prototype = needmanager.prototype;


module.exports = tgneedy;
