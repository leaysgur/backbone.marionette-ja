// MarionetteJS (Backbone.Marionette)
// ----------------------------------
// v1.8.1
//
// Copyright (c)2014 Derick Bailey, Muted Solutions, LLC.
// Distributed under MIT license
//
// http://marionettejs.com


/*!
 * Includes BabySitter
 * https://github.com/marionettejs/backbone.babysitter/
 *
 * Includes Wreqr
 * https://github.com/marionettejs/backbone.wreqr/
 */


// Backbone.BabySitter
// -------------------
// v0.1.0
//
// Copyright (c)2014 Derick Bailey, Muted Solutions, LLC.
// Distributed under MIT license
//
// http://github.com/marionettejs/backbone.babysitter

// Backbone.ChildViewContainer
// ---------------------------
//
// ChildViewContainerは、子となるビューを格納し、
// 取得、削除する親コンテナを提供します。

Backbone.ChildViewContainer = (function(Backbone, _){

  // コンストラクタ
  // --------------
  var Container = function(views){
    this._views = {};
    this._indexByModel = {};
    this._indexByCustom = {};
    this._updateLength();

    _.each(views, this.add, this);
  };

  // メソッド
  // --------
  _.extend(Container.prototype, {

    // コンテナに対してビューを追加します。
    // 格納されたビューは`cid`が割り振られ、
    // モデルのcid(とモデル自身)によって検索できるようになります。
    // また、`cid`ではなく独自のキーを割り振ることもできます。
    add: function(view, customIndex){
      var viewCid = view.cid;

      // ビューを格納
      this._views[viewCid] = view;

      // モデルのidで索引
      if (view.model){
        this._indexByModel[view.model.cid] = viewCid;
      }

      // 独自のキーで索引
      if (customIndex){
        this._indexByCustom[customIndex] = viewCid;
      }

      this._updateLength();
      return this;
    },

    // 紐付けられたモデルでビューを検索し、取得します。
    // モデルの`cid`を検索に使用します。
    findByModel: function(model){
      return this.findByModelCid(model.cid);
    },

    // 紐付けられたモデルの`cid`でビューを検索し、取得します。
    findByModelCid: function(modelCid){
      var viewCid = this._indexByModel[modelCid];
      return this.findByCid(viewCid);
    },

    // 独自のキーでビューを検索し、取得します。
    findByCustom: function(index){
      var viewCid = this._indexByCustom[index];
      return this.findByCid(viewCid);
    },

    // インデックスでビューを検索し、ビューを取得します。
    // ただしインデックスは保証されていません。
    findByIndex: function(index){
      return _.values(this._views)[index];
    },

    // 直接`cid`で検索し、ビューを取得します。
    findByCid: function(cid){
      return this._views[cid];
    },

    // ビューを削除します
    remove: function(view){
      var viewCid = view.cid;

      // モデルの索引を削除
      if (view.model){
        delete this._indexByModel[view.model.cid];
      }

      // 独自キーの索引を削除
      _.any(this._indexByCustom, function(cid, key) {
        if (cid === viewCid) {
          delete this._indexByCustom[key];
          return true;
        }
      }, this);

      // コンテナに格納したビューを削除
      delete this._views[viewCid];

      // コンテナを更新
      this._updateLength();
      return this;
    },

    // コンテナに格納されているビューに対してメソッドを実行します。
    // `function.call`のように、メソッドと引数を一度に渡すことができます。
    call: function(method){
      this.apply(method, _.tail(arguments));
    },

    // コンテナに格納されているビューに対してメソッドを実行します。
    // `function.apply`のように、メソッドと引数を一度に渡すことができます。
    apply: function(method, args){
      _.each(this._views, function(view){
        if (_.isFunction(view[method])){
          view[method].apply(view, args || []);
        }
      });
    },

    // コンテナの`.length`を更新します。
    _updateLength: function(){
      this.length = _.size(this._views);
    }
  });

  // Backbone.Collectionからコードを拝借。
  // http://backbonejs.org/docs/backbone.html#section-106
  //
  // コレクションに関するの操作のために、Underscoreのメソッドを実装します。
  var methods = ['forEach', 'each', 'map', 'find', 'detect', 'filter',
    'select', 'reject', 'every', 'all', 'some', 'any', 'include',
    'contains', 'invoke', 'toArray', 'first', 'initial', 'rest',
    'last', 'without', 'isEmpty', 'pluck'];

  _.each(methods, function(method) {
    Container.prototype[method] = function() {
      var views = _.values(this._views);
      var args = [views].concat(_.toArray(arguments));
      return _[method].apply(_, args);
    };
  });

  // コンテナを返す
  return Container;
})(Backbone, _);

// Backbone.Wreqr (Backbone.Marionette)
// ------------------------------------
// v1.1.0
//
// Copyright (c)2014 Derick Bailey, Muted Solutions, LLC.
// Distributed under MIT license
//
// http://github.com/marionettejs/backbone.wreqr


Backbone.Wreqr = (function(Backbone, Marionette, _){
  "use strict";
  var Wreqr = {};

// ハンドラ
// --------
// メソッドを名前付きで保存しておくところ。

Wreqr.Handlers = (function(Backbone, _){
  "use strict";

  // コンストラクタ
  // --------------

  var Handlers = function(options){
    this.options = options;
    this._wreqrHandlers = {};

    if (_.isFunction(this.initialize)){
      this.initialize(options);
    }
  };

  Handlers.extend = Backbone.Model.extend;

  // インスタンスのメンバ
  // --------------------

  _.extend(Handlers.prototype, Backbone.Events, {

    // 複数のハンドラをオブジェクトリテラルで設定できます。
    setHandlers: function(handlers){
      _.each(handlers, function(handler, name){
        var context = null;

        if (_.isObject(handler) && !_.isFunction(handler)){
          context = handler.context;
          handler = handler.callback;
        }

        this.setHandler(name, handler, context);
      }, this);
    },

    // ハンドラを名前付きで設定します。
    // コンテキストをオプションで指定できます。
    setHandler: function(name, handler, context){
      var config = {
        callback: handler,
        context: context
      };

      this._wreqrHandlers[name] = config;

      this.trigger("handler:add", name, handler, context);
    },

    // ハンドラが設定されているかを取得します。
    hasHandler: function(name){
      return !! this._wreqrHandlers[name];
    },

    // 指定した名前のハンドラを取得します。
    // ハンドラが見つからなかった場合は、例外を投げます。
    // (とか言いつつreturnしてるだけに見える・・。)
    getHandler: function(name){
      var config = this._wreqrHandlers[name];

      if (!config){
        return;
      }

      return function(){
        var args = Array.prototype.slice.apply(arguments);
        return config.callback.apply(config.context, args);
      };
    },

    // 指定した名前のハンドラを削除します。
    removeHandler: function(name){
      delete this._wreqrHandlers[name];
    },

    // 全てのハンドラを削除します。
    removeAllHandlers: function(){
      this._wreqrHandlers = {};
    }
  });

  return Handlers;
})(Backbone, _);

  // Wreqr.CommandStorage
// ----------------------
//
// コマンドを格納するストレージです。
Wreqr.CommandStorage = (function(){
  "use strict";

  // コンストラクタ
  var CommandStorage = function(options){
    this.options = options;
    this._commands = {};

    if (_.isFunction(this.initialize)){
      this.initialize(options);
    }
  };

  // インスタンスメソッド
  _.extend(CommandStorage.prototype, Backbone.Events, {

    // コマンド名を指定して、コマンドのオブジェクトを取得します。
    // それらは`commandName`と、`instances`というプロパティを持ちます。
    // `instances`は、実行するコマンド群の配列です。
    getCommands: function(commandName){
      var commands = this._commands[commandName];

      // 見つからなかったら追加
      if (!commands){

        // オブジェクト作成
        commands = {
          command: commandName,
          instances: []
        };

        // そして格納
        this._commands[commandName] = commands;
      }

      return commands;
    },

    // 名前でコマンドを追加し、引数も格納しておきます。
    addCommand: function(commandName, args){
      var command = this.getCommands(commandName);
      command.instances.push(args);
    },

    // コマンド名を指定して、そのコマンドを全て削除します。
    clearCommands: function(commandName){
      var command = this.getCommands(commandName);
      command.instances = [];
    }
  });

  return CommandStorage;
})();

// Wreqr.Commands
// --------------
//
// コマンドのハンドラを登録し実行する、シンプルなコマンドパターンの実装です。
Wreqr.Commands = (function(Wreqr){
  "use strict";

  return Wreqr.Handlers.extend({
    // デフォルトのストレージタイプ
    storageType: Wreqr.CommandStorage,

    constructor: function(options){
      this.options = options || {};

      this._initializeStorage(this.options);
      this.on("handler:add", this._executeCommands, this);

      var args = Array.prototype.slice.call(arguments);
      Wreqr.Handlers.prototype.constructor.apply(this, args);
    },

    // 与えられた名前と引数でもってコマンドを実行します。
    execute: function(name, args){
      name = arguments[0];
      args = Array.prototype.slice.call(arguments, 1);

      if (this.hasHandler(name)){
        this.getHandler(name).apply(this, args);
      } else {
        this.storage.addCommand(name, args);
      }

    },

    // 格納されたコマンドを実行するための内部メソッドです。
    _executeCommands: function(name, handler, context){
      var command = this.storage.getCommands(name);

      // 格納されているコマンドの配列をループし、インスタンス全てを実行します。
      _.each(command.instances, function(args){
        handler.apply(context, args);
      });

      this.storage.clearCommands(name);
    },

    // コマンドのストレージを初期化する内部メソッドです。
    // `storageType`か`options.storageType`のいずれかを指定します。
    _initializeStorage: function(options){
      var storage;

      var StorageType = options.storageType || this.storageType;
      if (_.isFunction(StorageType)){
        storage = new StorageType();
      } else {
        storage = StorageType;
      }

      this.storage = storage;
    }
  });

})(Wreqr);

// Wreqr.RequestResponse
// ---------------------
//
// リクエスト/レスポンスの実装です。
// リクエストにハンドラを登録し、レスポンスを返すようにします。
Wreqr.RequestResponse = (function(Wreqr){
  "use strict";

  return Wreqr.Handlers.extend({
    request: function(){
      var name = arguments[0];
      var args = Array.prototype.slice.call(arguments, 1);
      if (this.hasHandler(name)) {
        return this.getHandler(name).apply(this, args);
      }
    }
  });

})(Wreqr);

// Event Aggregator
// ----------------
//
// 各モジュールの関係を疎結合にし、イベントドリブンで構築するための、
// Pub/Subの実装を提供するオブジェクトです。

Wreqr.EventAggregator = (function(Backbone, _){
  "use strict";
  var EA = function(){};

  // Backboneの`extend`機構を使う
  EA.extend = Backbone.Model.extend;

  // Backbone.Eventsも継承
  _.extend(EA.prototype, Backbone.Events);

  return EA;
})(Backbone, _);

// Wreqr.Channel
// --------------
//
// 以下のメッセージングの実装をラップするものです。
// 実装はEventAggregator, RequestResponse, Commandsの3つです。
Wreqr.Channel = (function(Wreqr){
  "use strict";

  var Channel = function(channelName) {
    this.vent        = new Backbone.Wreqr.EventAggregator();
    this.reqres      = new Backbone.Wreqr.RequestResponse();
    this.commands    = new Backbone.Wreqr.Commands();
    this.channelName = channelName;
  };

  _.extend(Channel.prototype, {

    // このチャンネルのハンドラ類を全て削除します。
    reset: function() {
      this.vent.off();
      this.vent.stopListening();
      this.reqres.removeAllHandlers();
      this.commands.removeAllHandlers();
      return this;
    },

    // それぞれのメッセージングの実装に対して与えられたハッシュを紐付けします。
    connectEvents: function(hash, context) {
      this._connect('vent', hash, context);
      return this;
    },

    connectCommands: function(hash, context) {
      this._connect('commands', hash, context);
      return this;
    },

    connectRequests: function(hash, context) {
      this._connect('reqres', hash, context);
      return this;
    },

    // メッセージングの`type`に応じて、ハンドラを設定します。
    _connect: function(type, hash, context) {
      if (!hash) {
        return;
      }

      context = context || this;
      var method = (type === 'vent') ? 'on' : 'setHandler';

      _.each(hash, function(fn, eventName) {
        this[type][method](eventName, _.bind(fn, context));
      }, this);
    }
  });


  return Channel;
})(Wreqr);

// Wreqr.Radio
// -----------
//
// 複数のチャンネルを操作するオブジェクトを提供します。
Wreqr.radio = (function(Wreqr){
  "use strict";

  var Radio = function() {
    this._channels = {};
    this.vent = {};
    this.commands = {};
    this.reqres = {};
    this._proxyMethods();
  };

  _.extend(Radio.prototype, {

    channel: function(channelName) {
      if (!channelName) {
        throw new Error('Channel must receive a name');
      }

      return this._getChannel( channelName );
    },

    _getChannel: function(channelName) {
      var channel = this._channels[channelName];

      if(!channel) {
        channel = new Wreqr.Channel(channelName);
        this._channels[channelName] = channel;
      }

      return channel;
    },

    _proxyMethods: function() {
      _.each(['vent', 'commands', 'reqres'], function(system) {
        _.each( messageSystems[system], function(method) {
          this[system][method] = proxyMethod(this, system, method);
        }, this);
      }, this);
    }
  });


  var messageSystems = {
    vent: [
      'on',
      'off',
      'trigger',
      'once',
      'stopListening',
      'listenTo',
      'listenToOnce'
    ],

    commands: [
      'execute',
      'setHandler',
      'setHandlers',
      'removeHandler',
      'removeAllHandlers'
    ],

    reqres: [
      'request',
      'setHandler',
      'setHandlers',
      'removeHandler',
      'removeAllHandlers'
    ]
  };

  var proxyMethod = function(radio, system, method) {
    return function(channelName) {
      var messageSystem = radio._getChannel(channelName)[system];
      var args = Array.prototype.slice.call(arguments, 1);

      messageSystem[method].apply(messageSystem, args);
    };
  };

  return new Radio();

})(Wreqr);


  return Wreqr;
})(Backbone, Backbone.Marionette, _);

var Marionette = (function(global, Backbone, _){
  "use strict";

  // Marionetteとしてエクスポートする名前空間をココで指定
  var Marionette = {};
  Backbone.Marionette = Marionette;

  // あとで使うDOM操作のために`$`を取得
  Marionette.$ = Backbone.$;

// Helpers
// -------
//
// `arguments`を`slice`する用
var slice = Array.prototype.slice;

function throwError(message, name) {
  var error = new Error(message);
  error.name = name || 'Error';
  throw error;
}

// Marionette.extend
// -----------------
//
// Backboneの`extend`を継承しておく
Marionette.extend = Backbone.Model.extend;

// Marionette.getOption
// --------------------
//
// 与えられたターゲットから値を取得します。
// `options`があればそちらを優先して取得します。
Marionette.getOption = function(target, optionName){
  if (!target || !optionName){ return; }
  var value;

  if (target.options && (optionName in target.options) && (target.options[optionName] !== undefined)){
    value = target.options[optionName];
  } else {
    value = target[optionName];
  }

  return value;
};

// Marionette.normalizeMethods
// ---------------------------
//
// イベント名: メソッド、またはメソッド名のマップを、
// イベント名: メソッドの形に揃えて返します。
Marionette.normalizeMethods = function(hash) {
  var normalizedHash = {}, method;
  _.each(hash, function(fn, name) {
    method = fn;
    if (!_.isFunction(method)) {
      method = this[method];
    }
    if (!method) {
      return;
    }
    normalizedHash[name] = method;
  }, this);
  return normalizedHash;
};


// トリガーやイベント定義の際、
// 定義したuiの要素に対して、
// `@ui.elementName`といった記述を可能にします。
Marionette.normalizeUIKeys = function(hash, ui) {
  if (typeof(hash) === "undefined") {
    return;
  }

  _.each(_.keys(hash), function(v) {
    var pattern = /@ui.[a-zA-Z_$0-9]*/g;
    if (v.match(pattern)) {
      hash[v.replace(pattern, function(r) {
        return ui[r.slice(4)];
      })] = hash[v];
      delete hash[v];
    }
  });

  return hash;
};

// Backbone.Collectionからコードを拝借。
// http://backbonejs.org/docs/backbone.html#section-106
//
// コレクションに関するの操作のために、Underscoreのメソッドを実装します。
Marionette.actAsCollection = function(object, listProperty) {
  var methods = ['forEach', 'each', 'map', 'find', 'detect', 'filter',
    'select', 'reject', 'every', 'all', 'some', 'any', 'include',
    'contains', 'invoke', 'toArray', 'first', 'initial', 'rest',
    'last', 'without', 'isEmpty', 'pluck'];

  _.each(methods, function(method) {
    object[method] = function() {
      var list = _.values(_.result(this, listProperty));
      var args = [list].concat(_.toArray(arguments));
      return _[method].apply(_, args);
    };
  });
};

// イベントを発火、もしくはイベント名に一致するメソッドを実行します。
// 例えば、
// `this.triggerMethod("foo")`は、
// "foo"イベントを発火し、"onFoo"に紐付けられたメソッドを実行します。
Marionette.triggerMethod = (function(){

  // イベント名を":"で分割
  var splitter = /(^|:)(\w)/gi;

  // イベント名を受け取り、アッパーケースにします。
  function getEventName(match, prefix, eventName) {
    return eventName.toUpperCase();
  }

  // 実装の実態はココに
  var triggerMethod = function(event) {
    // イベント名をメソッド名に
    var methodName = 'on' + event.replace(splitter, getEventName);
    var method = this[methodName];

    // トリガーがメソッドの場合それを実行
    if(_.isFunction(this.trigger)) {
      this.trigger.apply(this, arguments);
    }

    // `onMethodName`の形式でメソッドが指定されていれば実行
    if (_.isFunction(method)) {
      // イベント名以外を引数として渡す
      return method.apply(this, _.tail(arguments));
    }
  };

  return triggerMethod;
})();

// DOMRefresh
// ----------
//
// ビューの状態を監視し、DOMに組み込まれたタイミングや、
// 更新されたタイミングで、"dom:refresh"イベントを発火します。

Marionette.MonitorDOMRefresh = (function(documentElement){
  // ビューがDOMに組み込まれたかどうかを監視するハンドラ。
  // Marionette.Regionを使います。
  function handleShow(view){
    view._isShown = true;
    triggerDOMRefresh(view);
  }

  // ビューがレンダリングされたかどうかを監視するハンドラ
  function handleRender(view){
    view._isRendered = true;
    triggerDOMRefresh(view);
  }

  // "dom:refresh"イベントを発火し、
  // "onDomRefresh"に紐付けられたメソッドを実行します。
  function triggerDOMRefresh(view){
    if (view._isShown && view._isRendered && isInDOM(view)){
      if (_.isFunction(view.triggerMethod)){
        view.triggerMethod("dom:refresh");
      }
    }
  }

  function isInDOM(view) {
    return documentElement.contains(view.el);
  }

  // エクスポート
  return function(view){
    view.listenTo(view, "show", function(){
      handleShow(view);
    });

    view.listenTo(view, "render", function(){
      handleRender(view);
    });
  };
})(document.documentElement);


// Marionette.bindEntityEvents & unbindEntityEvents
// ------------------------------------------------
//
// Backboneの"entity"(コレクションやモデル)に対して、
// オブジェクトのメソッドをバインド/アンバインドします。
//
// 第一引数は`target`で、`listenTo`メソッドが使える必要があります。
//
// 第二引数はメソッドをバインドしたいBackboneのモデルかコレクションです。
//
// 第三引数は{ "event:name": "eventHandler" }形式のハッシュです。
// メソッド名ではなくメソッドそのものを指定することもできます。

(function(Marionette){
  "use strict";

  // Bind the event to handlers specified as a string of
  // handler names on the target object
  // メソッド名で指定されたイベントを、ハンドラにバインドします。
  function bindFromStrings(target, entity, evt, methods){
    var methodNames = methods.split(/\s+/);

    _.each(methodNames, function(methodName) {

      var method = target[methodName];
      if(!method) {
        throwError("Method '"+ methodName +"' was configured as an event handler, but does not exist.");
      }

      target.listenTo(entity, evt, method);
    });
  }

  // 与えられたメソッドをイベントにバインドする
  function bindToFunction(target, entity, evt, method){
      target.listenTo(entity, evt, method);
  }

  // 与えられたメソッド名からメソッドを探してきて、イベントをアンバインドする
  function unbindFromStrings(target, entity, evt, methods){
    var methodNames = methods.split(/\s+/);

    _.each(methodNames, function(methodName) {
      var method = target[methodName];
      target.stopListening(entity, evt, method);
    });
  }

  // バインドしたメソッドのアンバインド
  function unbindToFunction(target, entity, evt, method){
      target.stopListening(entity, evt, method);
  }


  // ハッシュはもちろん複数くるのでループする
  function iterateEvents(target, entity, bindings, functionCallback, stringCallback){
    if (!entity || !bindings) { return; }

    // メソッドそのものがきてもOK
    if (_.isFunction(bindings)){
      bindings = bindings.call(target);
    }

    // ハッシュをイテレートしてバインドしてく
    _.each(bindings, function(methods, evt){

      // メソッド名か、メソッドそのものか判断して処理
      if (_.isFunction(methods)){
        functionCallback(target, entity, evt, methods);
      } else {
        stringCallback(target, entity, evt, methods);
      }

    });
  }

  // エクスポート
  Marionette.bindEntityEvents = function(target, entity, bindings){
    iterateEvents(target, entity, bindings, bindToFunction, bindFromStrings);
  };

  Marionette.unbindEntityEvents = function(target, entity, bindings){
    iterateEvents(target, entity, bindings, unbindToFunction, unbindFromStrings);
  };

})(Marionette);


// Callbacks
// ---------

// 複数のコールバックをよしなに処理します。
// jQueryの`Deferred`オブジェクトを使います。
Marionette.Callbacks = function(){
  this._deferred = Marionette.$.Deferred();
  this._callbacks = [];
};

_.extend(Marionette.Callbacks.prototype, {

  // あとでまとめて実行したいコールバックを追加します。
  // `run`メソッドを実行した後でも、ココで追加したコールバックは実行されます。
  add: function(callback, contextOverride){
    this._callbacks.push({cb: callback, ctx: contextOverride});

    this._deferred.done(function(context, options){
      if (contextOverride){ context = contextOverride; }
      callback.call(context, options);
    });
  },

  // 追加しておいたコールバックを実行します。
  // コールバックのコンテキストは指定することができます。
  // この後に追加したコールバックは、即実行されます。
  run: function(options, context){
    this._deferred.resolve(context, options);
  },

  // 追加したコールバックをリセットします。
  // これにより同じ内容のコールバックを複数回実行することもできます。
  reset: function(){
    var callbacks = this._callbacks;
    this._deferred = Marionette.$.Deferred();
    this._callbacks = [];

    _.each(callbacks, function(cb){
      this.add(cb.cb, cb.ctx);
    }, this);
  }
});

// Marionette Controller
// ---------------------
//
// 多目的なオブジェクト。
// モジュール、ルーターのコントローラーであったり、
// 他のビュー等を仲介するメディエータとして機能したりします。
Marionette.Controller = function(options){
  this.triggerMethod = Marionette.triggerMethod;
  this.options = options || {};

  if (_.isFunction(this.initialize)){
    this.initialize(this.options);
  }
};

Marionette.Controller.extend = Marionette.extend;

// Controller Methods
// ------------------

// 必ずBackbone.Eventsを使ってイベントをトリガーするように
_.extend(Marionette.Controller.prototype, Backbone.Events, {
  close: function(){
    this.stopListening();
    var args = Array.prototype.slice.call(arguments);
    this.triggerMethod.apply(this, ["close"].concat(args));
    this.off();
  }
});

// Region
// ------
//
// アプリケーションを構成するリージョンを管理します。
// 以下、参考リンク。
// http://lostechies.com/derickbailey/2011/12/12/composite-js-apps-regions-and-region-managers/

Marionette.Region = function(options){
  this.options = options || {};
  this.el = Marionette.getOption(this, "el");

  if (!this.el){
    throwError("An 'el' must be specified for a region.", "NoElError");
  }

  if (this.initialize){
    var args = Array.prototype.slice.apply(arguments);
    this.initialize.apply(this, args);
  }
};


// Region Type methods
// -------------------

_.extend(Marionette.Region, {

  // 設定オブジェクトを使って、リージョンのインスタンスを作ります。
  // リージョンのタイプを初期タイプとして設定します。
  //
  // 設定オブジェクトは、jQueryのDOMセレクタ名とリージョンタイプ、
  // もしくは、以下のようなオブジェクトリテラルで指定します。
  //
  // ```js
  // {
  //   selector: "#foo",
  //   regionType: MyCustomRegion
  // }
  // ```
  //
  buildRegion: function(regionConfig, defaultRegionType){
    var regionIsString = _.isString(regionConfig);
    var regionSelectorIsString = _.isString(regionConfig.selector);
    var regionTypeIsUndefined = _.isUndefined(regionConfig.regionType);
    var regionIsType = _.isFunction(regionConfig);

    if (!regionIsType && !regionIsString && !regionSelectorIsString) {
      throwError("Region must be specified as a Region type, a selector string or an object with selector property");
    }

    var selector, RegionType;

    // セレクタを取得
    if (regionIsString) {
      selector = regionConfig;
    }

    if (regionConfig.selector) {
      selector = regionConfig.selector;
      delete regionConfig.selector;
    }

    // リージョンのタイプを取得
    if (regionIsType){
      RegionType = regionConfig;
    }

    if (!regionIsType && regionTypeIsUndefined) {
      RegionType = defaultRegionType;
    }

    if (regionConfig.regionType) {
      RegionType = regionConfig.regionType;
      delete regionConfig.regionType;
    }

    if (regionIsString || regionIsType) {
      regionConfig = {};
    }

    regionConfig.el = selector;

    // インスタンス作成
    var region = new RegionType(regionConfig);

    // リージョン内でセレクタが要素を見つけられるように、
    // 親要素を持っている場合、`getEl`メソッドをオーバーライドします。
    // リージョン作成時に、オブジェクトリテラルで指定された`el`を、
    // `parentEl.find(selector)`で取得しようとしても、
    // その持点でDOMに組み込まれていないかも知れず、問題になるかもしれません。
    if (regionConfig.parentEl){
      region.getEl = function(selector) {
        var parentEl = regionConfig.parentEl;
        if (_.isFunction(parentEl)){
          parentEl = parentEl();
        }
        return parentEl.find(selector);
      };
    }

    return region;
  }

});

// Region Instance Methods
// -----------------------

_.extend(Marionette.Region.prototype, Backbone.Events, {

  // リージョン内のBackboneのビューのインスタンスを表示します。
  // `el`に指定した値も参照し、`render`メソッドを自動的に実行します。
  // そして、`onShow`と`onClose`メソッドををビューに提供します。
  // ビューを表示した直後、削除される直前に実行されるハンドラです。
  // `preventClose`オプションを使えば、新しいビューの表示時に、
  // 自動的に古いビューを削除する挙動を抑制できます。
  show: function(view, options){
    this.ensureEl();

    var showOptions = options || {};
    var isViewClosed = view.isClosed || _.isUndefined(view.$el);
    var isDifferentView = view !== this.currentView;
    var preventClose =  !!showOptions.preventClose;

    // 異なるビューで、preventCloseの指定がない場合に、古いビューを削除
    var _shouldCloseView = !preventClose && isDifferentView;

    if (_shouldCloseView) {
      this.close();
    }

    view.render();
    Marionette.triggerMethod.call(this, "before:show", view);
    Marionette.triggerMethod.call(view, "before:show");

    if (isDifferentView || isViewClosed) {
      this.open(view);
    }

    this.currentView = view;

    Marionette.triggerMethod.call(this, "show", view);
    Marionette.triggerMethod.call(view, "show");
  },

  ensureEl: function(){
    if (!this.$el || this.$el.length === 0){
      this.$el = this.getEl(this.el);
    }
  },

  // リージョンが管理するDOMを検索する挙動を変えるには、
  // このメソッドをオーバーライドします。
  // このメソッドは、jQueryオブジェクトを返します。
  getEl: function(selector){
    return Marionette.$(selector);
  },

  // リージョンが管理するビューを、
  // どのように`$el`に追加するかの挙動を変えるには、
  // このメソッドをオーバーライドします。
  open: function(view){
    this.$el.empty().append(view.el);
  },

  // 現在表示しているビューを削除します。
  // 何もない場合は、何もせず即座に返ります。
  close: function(){
    var view = this.currentView;
    if (!view || view.isClosed){ return; }

    // 'close'か'remove'か、見つかった方を実行
    if (view.close) { view.close(); }
    else if (view.remove) { view.remove(); }

    Marionette.triggerMethod.call(this, "close", view);

    delete this.currentView;
  },

  // 既存のビューをリージョンにセットします。
  // この場合、`render`や`onShow`は実行されず、
  // リージョンの`el`を置き換えることもしません。
  attachView: function(view){
    this.currentView = view;
  },

  // リージョンに属する全てのビューを削除し、キャッシュされた`$el`を削除します。
  // 次にビューのが表示されるときには、リージョンの`el`のために再度要素を取得します。
  reset: function(){
    this.close();
    delete this.$el;
  }
});

// Backboneの`extend`を継承
Marionette.Region.extend = Marionette.extend;

// Marionette.RegionManager
// ------------------------
//
// 1つまたは複数のリージョンを管理します。
Marionette.RegionManager = (function(Marionette){

  var RegionManager = Marionette.Controller.extend({
    constructor: function(options){
      this._regions = {};
      Marionette.Controller.prototype.constructor.call(this, options);
    },

    // オブジェクトリテラルを使って、複数のリージョンを追加します。
    // キーがリージョン名、バリューがリージョンの定義であるセレクタです。
    addRegions: function(regionDefinitions, defaults){
      var regions = {};

      _.each(regionDefinitions, function(definition, name){
        if (_.isString(definition)){
          definition = { selector: definition };
        }

        if (definition.selector){
          definition = _.defaults({}, definition, defaults);
        }

        var region = this.addRegion(name, definition);
        regions[name] = region;
      }, this);

      return regions;
    },

    // 1つのリージョンを追加し、リージョンのインスタンスを返します。
    addRegion: function(name, definition){
      var region;

      var isObject = _.isObject(definition);
      var isString = _.isString(definition);
      var hasSelector = !!definition.selector;

      if (isString || (isObject && hasSelector)){
        region = Marionette.Region.buildRegion(definition, Marionette.Region);
      } else if (_.isFunction(definition)){
        region = Marionette.Region.buildRegion(definition, Marionette.Region);
      } else {
        region = definition;
      }

      this._store(name, region);
      this.triggerMethod("region:add", name, region);
      return region;
    },

    // リージョン名でリージョンを取得します。
    get: function(name){
      return this._regions[name];
    },

    // リージョン名でリージョンを削除します。
    removeRegion: function(name){
      var region = this._regions[name];
      this._remove(name, region);
    },

    // 追加したリージョンを全て削除します。
    removeRegions: function(){
      _.each(this._regions, function(region, name){
        this._remove(name, region);
      }, this);
    },

    // 追加したリージョンを全て削除しますが、
    // 引き続き管理下におきます。
    closeRegions: function(){
      _.each(this._regions, function(region, name){
        region.close();
      }, this);
    },

    // 追加したリージョンを全て削除し、
    // リージョンマネージャー自身も削除します。
    close: function(){
      this.removeRegions();
      Marionette.Controller.prototype.close.apply(this, arguments);
    },

    // リージョンを追加する内部メソッドです。
    _store: function(name, region){
      this._regions[name] = region;
      this._setLength();
    },

    // リージョンを削除する内部メソッドです。
    _remove: function(name, region){
      region.close();
      region.stopListening();
      delete this._regions[name];
      this._setLength();
      this.triggerMethod("region:remove", name, region);
    },

    // 管理しているリージョンの数を更新します。
    _setLength: function(){
      this.length = _.size(this._regions);
    }

  });

  Marionette.actAsCollection(RegionManager.prototype, '_regions');

  return RegionManager;
})(Marionette);


// Template Cache
// --------------

// `<script>`タグ内のテンプレートをキャッシュし、
// 効率よく利用できるように管理します。
Marionette.TemplateCache = function(templateId){
  this.templateId = templateId;
};

// TemplateCacheオブジェクトが保持するメソッド。
// インスタンスを作る代わりに、
// このオブジェクトでテンプレートのキャッシュを管理します。
_.extend(Marionette.TemplateCache, {
  templateCaches: {},

  // idによって特定のテンプレートを取得します。
  // キャッシュがあるかをまず確認し、なければDOMから取得します。
  get: function(templateId){
    var cachedTemplate = this.templateCaches[templateId];

    if (!cachedTemplate){
      cachedTemplate = new Marionette.TemplateCache(templateId);
      this.templateCaches[templateId] = cachedTemplate;
    }

    return cachedTemplate.load();
  },

  // テンプレートのキャッシュをクリアします。
  // 引数なしに実行されると全てのテンプレートを、
  // idを与えるとそれらのキャッシュをクリアします。
  // `clear()`もしくは、`clear("#t1", "#t2", "...")`のように使います。
  clear: function(){
    var i;
    var args = slice.call(arguments);
    var length = args.length;

    if (length > 0){
      for(i=0; i<length; i++){
        delete this.templateCaches[args[i]];
      }
    } else {
      this.templateCaches = {};
    }
  }
});

// TemplateCacheのインスタンスメソッドです。
// これらにより、自身の状態やロード済みかどうかを知ることができます。
_.extend(Marionette.TemplateCache.prototype, {

  // テンプレートをロードする内部メソッド
  load: function(){
    // 多重に読み込まれるのを防止
    if (this.compiledTemplate){
      return this.compiledTemplate;
    }

    // テンプレートをロードしてコンパイル
    var template = this.loadTemplate(this.templateId);
    this.compiledTemplate = this.compileTemplate(template);

    return this.compiledTemplate;
  },

  // デフォルトではDOMからテンプレートをロードします。
  // テンプレート取得の挙動を変える場合は、このメソッドをオーバーライドします。
  // AMD/RequireJSの非同期読み込みや、以下のようなプラグインを使う場合です。
  // https://github.com/marionettejs/backbone.marionette/wiki/Using-marionette-with-requirejs
  loadTemplate: function(templateId){
    var template = Marionette.$(templateId).html();

    if (!template || template.length === 0){
      throwError("Could not find template: '" + templateId + "'", "NoTemplateError");
    }

    return template;
  },

  // キャッシュする前に、テンプレートをコンパイルします。
  // Handlebars等のテンプレートエンジンを使いたい場合や、
  // プリコンパイルの必要がない場合には、このメソッドをオーバーライドします。
  compileTemplate: function(rawTemplate){
    return _.template(rawTemplate);
  }
});

// Renderer
// --------

// 与えられたデータとテンプレートを使ってレンダリングします。
Marionette.Renderer = {

  // データを使ってテンプレートをレンダリングします。
  // `template`の引数は、`TemplateCache`オブジェクトへ渡ります。
  // レンダリングとテンプレートの管理を独自にやる場合は、このメソッドをオーバーライドします。
  render: function(template, data){

    if (!template) {
      throwError("Cannot render the template since it's false, null or undefined.", "TemplateNotFoundError");
    }

    var templateFunc;
    if (typeof template === "function"){
      templateFunc = template;
    } else {
      templateFunc = Marionette.TemplateCache.get(template);
    }

    return templateFunc(data);
  }
};


// Marionette.View
// ---------------

// Marionetteビューの元となるビュータイプを定義します。
Marionette.View = Backbone.View.extend({

  constructor: function(options){
    _.bindAll(this, "render");

    if (_.isObject(this.behaviors)) {
      new Marionette.Behaviors(this);
    }

    // ビューの初期化時に渡されるオプションです。
    // コレはBackboneで`this.options`が使われなくなったため、
    // 後方互換のために実装されています。
    // よって、いくつかの場面では使われないかもしれません。
    this.options = _.extend({}, _.result(this, 'options'), _.isFunction(options) ? options.call(this) : options);

    // @ui記法をパース
    this.events = this.normalizeUIKeys(_.result(this, 'events'));
    Backbone.View.prototype.constructor.apply(this, arguments);

    Marionette.MonitorDOMRefresh(this);
    this.listenTo(this, "show", this.onShowCalled);
  },

  // メソッドが存在し、一致するイベントがあった場合に実行するため、
  // "triggerMthod"をインポートします。
  triggerMethod: Marionette.triggerMethod,

  // イベント名: メソッド、またはメソッド名のマップを、
  // イベント名: メソッドの形に揃えて返す"normalizeMethods"をインポートします。
  normalizeMethods: Marionette.normalizeMethods,

  // このビューのインスタンス用のテンプレートを取得します。
  // ビューの定義時に`template`プロパティで設定することもできますし、
  // コンストラクタへオプションとして`template: "whatever"`形式で渡すこともできます。
  getTemplate: function(){
    return Marionette.getOption(this, "template");
  },

  // テンプレートのヘルパーメソッドをミックスインします。
  // オブジェクトリテラルか、オブジェクトを返すメソッドで、
  // `templateHelpers`プロパティに設定します。
  // 設定されたものは全てコピーして渡されます。
  mixinTemplateHelpers: function(target){
    target = target || {};
    var templateHelpers = Marionette.getOption(this, "templateHelpers");
    if (_.isFunction(templateHelpers)){
      templateHelpers = templateHelpers.call(this);
    }
    return _.extend(target, templateHelpers);
  },

  normalizeUIKeys: function(hash) {
    var ui = _.result(this, 'ui');
    return Marionette.normalizeUIKeys(hash, ui);
  },

  // トリガーの定義をDOMイベントからビューのイベントへコンバートします。
  configureTriggers: function(){
    if (!this.triggers) { return; }

    var triggerEvents = {};

    // `triggers`はメソッドでもOK
    var triggers = this.normalizeUIKeys(_.result(this, "triggers"));

    // preventDefaultやstopPropagationをトリガーにも設定します。
    _.each(triggers, function(value, key){

      var hasOptions = _.isObject(value);
      var eventName = hasOptions ? value.event : value;

      // DOMイベント用にハンドラを作成
      triggerEvents[key] = function(e){

        // イベントを抑止
        if (e) {
          var prevent = e.preventDefault;
          var stop = e.stopPropagation;

          var shouldPrevent = hasOptions ? value.preventDefault : prevent;
          var shouldStop = hasOptions ? value.stopPropagation : stop;

          if (shouldPrevent && prevent) { prevent.apply(e); }
          if (shouldStop && stop) { stop.apply(e); }
        }

        // イベント用に引数を作成
        var args = {
          view: this,
          model: this.model,
          collection: this.collection
        };

        // イベント発火
        this.triggerMethod(eventName, args);
      };

    }, this);

    return triggerEvents;
  },

  // `triggers`、`modelEvents`、`collectionEvents`にハンドラをバインドする、
  // Backbone.ViewのdelegateEventsをオーバーライドします。
  delegateEvents: function(events){
    this._delegateDOMEvents(events);
    Marionette.bindEntityEvents(this, this.model, Marionette.getOption(this, "modelEvents"));
    Marionette.bindEntityEvents(this, this.collection, Marionette.getOption(this, "collectionEvents"));
  },

  // DOMイベントやトリガーを扱う内部メソッドです。
  _delegateDOMEvents: function(events){
    events = events || this.events;
    if (_.isFunction(events)){ events = events.call(this); }

    var combinedEvents = {};

    // このビューがビヘイビアのイベントを持っているか確認
    var behaviorEvents = _.result(this, 'behaviorEvents') || {};
    var triggers = this.configureTriggers();

    // ビヘイビアのイベントは、ビューのイベントとトリガーによってオーバーライドされます。
    _.extend(combinedEvents, behaviorEvents, events, triggers);

    Backbone.View.prototype.delegateEvents.call(this, combinedEvents);
  },

  // `triggers`、`modelEvents`、`collectionEvents`へのハンドラをアンバインドする、
  // Backbone.ViewのundelegateEventsをオーバーライドします。
  undelegateEvents: function(){
    var args = Array.prototype.slice.call(arguments);
    Backbone.View.prototype.undelegateEvents.apply(this, args);

    Marionette.unbindEntityEvents(this, this.model, Marionette.getOption(this, "modelEvents"));
    Marionette.unbindEntityEvents(this, this.collection, Marionette.getOption(this, "collectionEvents"));
  },

  // `show`イベントを扱う内部メソッド。
  onShowCalled: function(){},

  // ビューをDOMから削除し、イベントをアンバインドする`close`メソッドの実装です。
  // リージョンはこのメソッドを実行します。
  // `onClose`メソッドを定義することができ、それはビューが削除された直後に実行されます。
  close: function(){
    if (this.isClosed) { return; }

    var args = Array.prototype.slice.call(arguments);

    // `onBeforeClose`メソッドが`false`を返すことで、closeをキャンセルできます。
    var shouldClose = this.triggerMethod.apply(this, ["before:close"].concat(args));
    if (shouldClose === false){
      return;
    }

    // 実際のcloseが行われるより先に、フラグをタテておきます。
    // そうすることで、他のビューに関連した"close"イベントが無限ループすることを防ぎます。
    this.isClosed = true;
    this.triggerMethod.apply(this, ["close"].concat(args));

    // UIに紐付けられたハンドラをアンバインド
    this.unbindUIElements();

    // DOMからビューを削除
    this.remove();
  },

  // ビューの"ui"プロパティ(中身はjQueryのセレクタ)を使い、実際にDOMをバインドします。
  bindUIElements: function(){
    if (!this.ui) { return; }

    // UIの定義を_uiBindingsへ退避。
    // そうすることで後にリセットすることができ、
    // レンダリングされたビューからバインドする要素を見つけることができます。
    if (!this._uiBindings){
      this._uiBindings = this.ui;
    }

    // メソッドなら結果、そうでないなら値をバインディング
    var bindings = _.result(this, "_uiBindings");

    // 最初は何もないように
    this.ui = {};

    // それぞれのセレクタをバインド
    _.each(_.keys(bindings), function(key) {
      var selector = bindings[key];
      this.ui[key] = this.$(selector);
    }, this);
  },

  // "ui"プロパティに定義された要素をアンバインドします。
  unbindUIElements: function(){
    if (!this.ui || !this._uiBindings){ return; }

    // 全てのバインディングを削除
    _.each(this.ui, function($el, name){
      delete this.ui[name];
    }, this);

    // UIの定義を元通りにリセット
    this.ui = this._uiBindings;
    delete this._uiBindings;
  }
});

// Item View
// ---------

// A single item view implementation that contains code for rendering
// with underscore.js templates, serializing the view's model or collection,
// and calling several methods on extended views, such as `onRender`.
Marionette.ItemView = Marionette.View.extend({

  // Setting up the inheritance chain which allows changes to
  // Marionette.View.prototype.constructor which allows overriding
  constructor: function(){
    Marionette.View.prototype.constructor.apply(this, arguments);
  },

  // Serialize the model or collection for the view. If a model is
  // found, `.toJSON()` is called. If a collection is found, `.toJSON()`
  // is also called, but is used to populate an `items` array in the
  // resulting data. If both are found, defaults to the model.
  // You can override the `serializeData` method in your own view
  // definition, to provide custom serialization for your view's data.
  serializeData: function(){
    var data = {};

    if (this.model) {
      data = this.model.toJSON();
    }
    else if (this.collection) {
      data = { items: this.collection.toJSON() };
    }

    return data;
  },

  // Render the view, defaulting to underscore.js templates.
  // You can override this in your view definition to provide
  // a very specific rendering for your view. In general, though,
  // you should override the `Marionette.Renderer` object to
  // change how Marionette renders views.
  render: function(){
    this.isClosed = false;

    this.triggerMethod("before:render", this);
    this.triggerMethod("item:before:render", this);

    var data = this.serializeData();
    data = this.mixinTemplateHelpers(data);

    var template = this.getTemplate();
    var html = Marionette.Renderer.render(template, data);

    this.$el.html(html);
    this.bindUIElements();

    this.triggerMethod("render", this);
    this.triggerMethod("item:rendered", this);

    return this;
  },

  // Override the default close event to add a few
  // more events that are triggered.
  close: function(){
    if (this.isClosed){ return; }

    this.triggerMethod('item:before:close');

    Marionette.View.prototype.close.apply(this, arguments);

    this.triggerMethod('item:closed');
  }
});

// Collection View
// ---------------

// A view that iterates over a Backbone.Collection
// and renders an individual ItemView for each model.
Marionette.CollectionView = Marionette.View.extend({
  // used as the prefix for item view events
  // that are forwarded through the collectionview
  itemViewEventPrefix: "itemview",

  // constructor
  constructor: function(options){
    this._initChildViewStorage();

    Marionette.View.prototype.constructor.apply(this, arguments);

    this._initialEvents();
    this.initRenderBuffer();
  },

  // Instead of inserting elements one by one into the page,
  // it's much more performant to insert elements into a document
  // fragment and then insert that document fragment into the page
  initRenderBuffer: function() {
    this.elBuffer = document.createDocumentFragment();
    this._bufferedChildren = [];
  },

  startBuffering: function() {
    this.initRenderBuffer();
    this.isBuffering = true;
  },

  endBuffering: function() {
    this.isBuffering = false;
    this.appendBuffer(this, this.elBuffer);
    this._triggerShowBufferedChildren();
    this.initRenderBuffer();
  },

  _triggerShowBufferedChildren: function () {
    if (this._isShown) {
      _.each(this._bufferedChildren, function (child) {
        Marionette.triggerMethod.call(child, "show");
      });
      this._bufferedChildren = [];
    }
  },

  // Configured the initial events that the collection view
  // binds to.
  _initialEvents: function(){
    if (this.collection){
      this.listenTo(this.collection, "add", this.addChildView);
      this.listenTo(this.collection, "remove", this.removeItemView);
      this.listenTo(this.collection, "reset", this.render);
    }
  },

  // Handle a child item added to the collection
  addChildView: function(item, collection, options){
    this.closeEmptyView();
    var ItemView = this.getItemView(item);
    var index = this.collection.indexOf(item);
    this.addItemView(item, ItemView, index);
  },

  // Override from `Marionette.View` to guarantee the `onShow` method
  // of child views is called.
  onShowCalled: function(){
    this.children.each(function(child){
      Marionette.triggerMethod.call(child, "show");
    });
  },

  // Internal method to trigger the before render callbacks
  // and events
  triggerBeforeRender: function(){
    this.triggerMethod("before:render", this);
    this.triggerMethod("collection:before:render", this);
  },

  // Internal method to trigger the rendered callbacks and
  // events
  triggerRendered: function(){
    this.triggerMethod("render", this);
    this.triggerMethod("collection:rendered", this);
  },

  // Render the collection of items. Override this method to
  // provide your own implementation of a render function for
  // the collection view.
  render: function(){
    this.isClosed = false;
    this.triggerBeforeRender();
    this._renderChildren();
    this.triggerRendered();
    return this;
  },

  // Internal method. Separated so that CompositeView can have
  // more control over events being triggered, around the rendering
  // process
  _renderChildren: function(){
    this.startBuffering();

    this.closeEmptyView();
    this.closeChildren();

    if (!this.isEmpty(this.collection)) {
      this.showCollection();
    } else {
      this.showEmptyView();
    }

    this.endBuffering();
  },

  // Internal method to loop through each item in the
  // collection view and show it
  showCollection: function(){
    var ItemView;
    this.collection.each(function(item, index){
      ItemView = this.getItemView(item);
      this.addItemView(item, ItemView, index);
    }, this);
  },

  // Internal method to show an empty view in place of
  // a collection of item views, when the collection is
  // empty
  showEmptyView: function(){
    var EmptyView = this.getEmptyView();

    if (EmptyView && !this._showingEmptyView){
      this._showingEmptyView = true;
      var model = new Backbone.Model();
      this.addItemView(model, EmptyView, 0);
    }
  },

  // Internal method to close an existing emptyView instance
  // if one exists. Called when a collection view has been
  // rendered empty, and then an item is added to the collection.
  closeEmptyView: function(){
    if (this._showingEmptyView){
      this.closeChildren();
      delete this._showingEmptyView;
    }
  },

  // Retrieve the empty view type
  getEmptyView: function(){
    return Marionette.getOption(this, "emptyView");
  },

  // Retrieve the itemView type, either from `this.options.itemView`
  // or from the `itemView` in the object definition. The "options"
  // takes precedence.
  getItemView: function(item){
    var itemView = Marionette.getOption(this, "itemView");

    if (!itemView){
      throwError("An `itemView` must be specified", "NoItemViewError");
    }

    return itemView;
  },

  // Render the child item's view and add it to the
  // HTML for the collection view.
  addItemView: function(item, ItemView, index){
    // get the itemViewOptions if any were specified
    var itemViewOptions = Marionette.getOption(this, "itemViewOptions");
    if (_.isFunction(itemViewOptions)){
      itemViewOptions = itemViewOptions.call(this, item, index);
    }

    // build the view
    var view = this.buildItemView(item, ItemView, itemViewOptions);

    // set up the child view event forwarding
    this.addChildViewEventForwarding(view);

    // this view is about to be added
    this.triggerMethod("before:item:added", view);

    // Store the child view itself so we can properly
    // remove and/or close it later
    this.children.add(view);

    // Render it and show it
    this.renderItemView(view, index);

    // call the "show" method if the collection view
    // has already been shown
    if (this._isShown && !this.isBuffering){
      Marionette.triggerMethod.call(view, "show");
    }

    // this view was added
    this.triggerMethod("after:item:added", view);

    return view;
  },

  // Set up the child view event forwarding. Uses an "itemview:"
  // prefix in front of all forwarded events.
  addChildViewEventForwarding: function(view){
    var prefix = Marionette.getOption(this, "itemViewEventPrefix");

    // Forward all child item view events through the parent,
    // prepending "itemview:" to the event name
    this.listenTo(view, "all", function(){
      var args = slice.call(arguments);
      var rootEvent = args[0];
      var itemEvents = this.normalizeMethods(this.getItemEvents());

      args[0] = prefix + ":" + rootEvent;
      args.splice(1, 0, view);

      // call collectionView itemEvent if defined
      if (typeof itemEvents !== "undefined" && _.isFunction(itemEvents[rootEvent])) {
        itemEvents[rootEvent].apply(this, args);
      }

      Marionette.triggerMethod.apply(this, args);
    }, this);
  },

  // returns the value of itemEvents depending on if a function
  getItemEvents: function() {
    if (_.isFunction(this.itemEvents)) {
      return this.itemEvents.call(this);
    }

    return this.itemEvents;
  },

  // render the item view
  renderItemView: function(view, index) {
    view.render();
    this.appendHtml(this, view, index);
  },

  // Build an `itemView` for every model in the collection.
  buildItemView: function(item, ItemViewType, itemViewOptions){
    var options = _.extend({model: item}, itemViewOptions);
    return new ItemViewType(options);
  },

  // get the child view by item it holds, and remove it
  removeItemView: function(item){
    var view = this.children.findByModel(item);
    this.removeChildView(view);
    this.checkEmpty();
  },

  // Remove the child view and close it
  removeChildView: function(view){

    // shut down the child view properly,
    // including events that the collection has from it
    if (view){
      // call 'close' or 'remove', depending on which is found
      if (view.close) { view.close(); }
      else if (view.remove) { view.remove(); }

      this.stopListening(view);
      this.children.remove(view);
    }

    this.triggerMethod("item:removed", view);
  },

  // helper to check if the collection is empty
  isEmpty: function(collection){
    // check if we're empty now
    return !this.collection || this.collection.length === 0;
  },

  // If empty, show the empty view
  checkEmpty: function (){
    if (this.isEmpty(this.collection)){
      this.showEmptyView();
    }
  },

  // You might need to override this if you've overridden appendHtml
  appendBuffer: function(collectionView, buffer) {
    collectionView.$el.append(buffer);
  },

  // Append the HTML to the collection's `el`.
  // Override this method to do something other
  // than `.append`.
  appendHtml: function(collectionView, itemView, index){
    if (collectionView.isBuffering) {
      // buffering happens on reset events and initial renders
      // in order to reduce the number of inserts into the
      // document, which are expensive.
      collectionView.elBuffer.appendChild(itemView.el);
      collectionView._bufferedChildren.push(itemView);
    }
    else {
      // If we've already rendered the main collection, just
      // append the new items directly into the element.
      collectionView.$el.append(itemView.el);
    }
  },

  // Internal method to set up the `children` object for
  // storing all of the child views
  _initChildViewStorage: function(){
    this.children = new Backbone.ChildViewContainer();
  },

  // Handle cleanup and other closing needs for
  // the collection of views.
  close: function(){
    if (this.isClosed){ return; }

    this.triggerMethod("collection:before:close");
    this.closeChildren();
    this.triggerMethod("collection:closed");

    Marionette.View.prototype.close.apply(this, arguments);
  },

  // Close the child views that this collection view
  // is holding on to, if any
  closeChildren: function(){
    this.children.each(function(child){
      this.removeChildView(child);
    }, this);
    this.checkEmpty();
  }
});

// Composite View
// --------------

// Used for rendering a branch-leaf, hierarchical structure.
// Extends directly from CollectionView and also renders an
// an item view as `modelView`, for the top leaf
Marionette.CompositeView = Marionette.CollectionView.extend({

  // Setting up the inheritance chain which allows changes to
  // Marionette.CollectionView.prototype.constructor which allows overriding
  constructor: function(){
    Marionette.CollectionView.prototype.constructor.apply(this, arguments);
  },

  // Configured the initial events that the composite view
  // binds to. Override this method to prevent the initial
  // events, or to add your own initial events.
  _initialEvents: function(){

    // Bind only after composite view is rendered to avoid adding child views
    // to nonexistent itemViewContainer
    this.once('render', function () {
      if (this.collection){
        this.listenTo(this.collection, "add", this.addChildView);
        this.listenTo(this.collection, "remove", this.removeItemView);
        this.listenTo(this.collection, "reset", this._renderChildren);
      }
    });

  },

  // Retrieve the `itemView` to be used when rendering each of
  // the items in the collection. The default is to return
  // `this.itemView` or Marionette.CompositeView if no `itemView`
  // has been defined
  getItemView: function(item){
    var itemView = Marionette.getOption(this, "itemView") || this.constructor;

    if (!itemView){
      throwError("An `itemView` must be specified", "NoItemViewError");
    }

    return itemView;
  },

  // Serialize the collection for the view.
  // You can override the `serializeData` method in your own view
  // definition, to provide custom serialization for your view's data.
  serializeData: function(){
    var data = {};

    if (this.model){
      data = this.model.toJSON();
    }

    return data;
  },

  // Renders the model once, and the collection once. Calling
  // this again will tell the model's view to re-render itself
  // but the collection will not re-render.
  render: function(){
    this.isRendered = true;
    this.isClosed = false;
    this.resetItemViewContainer();

    this.triggerBeforeRender();
    var html = this.renderModel();
    this.$el.html(html);
    // the ui bindings is done here and not at the end of render since they
    // will not be available until after the model is rendered, but should be
    // available before the collection is rendered.
    this.bindUIElements();
    this.triggerMethod("composite:model:rendered");

    this._renderChildren();

    this.triggerMethod("composite:rendered");
    this.triggerRendered();
    return this;
  },

  _renderChildren: function(){
    if (this.isRendered){
      this.triggerMethod("composite:collection:before:render");
      Marionette.CollectionView.prototype._renderChildren.call(this);
      this.triggerMethod("composite:collection:rendered");
    }
  },

  // Render an individual model, if we have one, as
  // part of a composite view (branch / leaf). For example:
  // a treeview.
  renderModel: function(){
    var data = {};
    data = this.serializeData();
    data = this.mixinTemplateHelpers(data);

    var template = this.getTemplate();
    return Marionette.Renderer.render(template, data);
  },


  // You might need to override this if you've overridden appendHtml
  appendBuffer: function(compositeView, buffer) {
    var $container = this.getItemViewContainer(compositeView);
    $container.append(buffer);
  },

  // Appends the `el` of itemView instances to the specified
  // `itemViewContainer` (a jQuery selector). Override this method to
  // provide custom logic of how the child item view instances have their
  // HTML appended to the composite view instance.
  appendHtml: function(compositeView, itemView, index){
    if (compositeView.isBuffering) {
      compositeView.elBuffer.appendChild(itemView.el);
      compositeView._bufferedChildren.push(itemView);
    }
    else {
      // If we've already rendered the main collection, just
      // append the new items directly into the element.
      var $container = this.getItemViewContainer(compositeView);
      $container.append(itemView.el);
    }
  },

  // Internal method to ensure an `$itemViewContainer` exists, for the
  // `appendHtml` method to use.
  getItemViewContainer: function(containerView){
    if ("$itemViewContainer" in containerView){
      return containerView.$itemViewContainer;
    }

    var container;
    var itemViewContainer = Marionette.getOption(containerView, "itemViewContainer");
    if (itemViewContainer){

      var selector = _.isFunction(itemViewContainer) ? itemViewContainer.call(containerView) : itemViewContainer;

      if (selector.charAt(0) === "@" && containerView.ui) {
        container = containerView.ui[selector.substr(4)];
      } else {
        container = containerView.$(selector);
      }

      if (container.length <= 0) {
        throwError("The specified `itemViewContainer` was not found: " + containerView.itemViewContainer, "ItemViewContainerMissingError");
      }

    } else {
      container = containerView.$el;
    }

    containerView.$itemViewContainer = container;
    return container;
  },

  // Internal method to reset the `$itemViewContainer` on render
  resetItemViewContainer: function(){
    if (this.$itemViewContainer){
      delete this.$itemViewContainer;
    }
  }
});

// Layout
// ------

// Used for managing application layouts, nested layouts and
// multiple regions within an application or sub-application.
//
// A specialized view type that renders an area of HTML and then
// attaches `Region` instances to the specified `regions`.
// Used for composite view management and sub-application areas.
Marionette.Layout = Marionette.ItemView.extend({
  regionType: Marionette.Region,

  // Ensure the regions are available when the `initialize` method
  // is called.
  constructor: function (options) {
    options = options || {};

    this._firstRender = true;
    this._initializeRegions(options);

    Marionette.ItemView.prototype.constructor.call(this, options);
  },

  // Layout's render will use the existing region objects the
  // first time it is called. Subsequent calls will close the
  // views that the regions are showing and then reset the `el`
  // for the regions to the newly rendered DOM elements.
  render: function(){

    if (this.isClosed){
      // a previously closed layout means we need to
      // completely re-initialize the regions
      this._initializeRegions();
    }
    if (this._firstRender) {
      // if this is the first render, don't do anything to
      // reset the regions
      this._firstRender = false;
    } else if (!this.isClosed){
      // If this is not the first render call, then we need to
      // re-initializing the `el` for each region
      this._reInitializeRegions();
    }

    return Marionette.ItemView.prototype.render.apply(this, arguments);
  },

  // Handle closing regions, and then close the view itself.
  close: function () {
    if (this.isClosed){ return; }
    this.regionManager.close();
    Marionette.ItemView.prototype.close.apply(this, arguments);
  },

  // Add a single region, by name, to the layout
  addRegion: function(name, definition){
    var regions = {};
    regions[name] = definition;
    return this._buildRegions(regions)[name];
  },

  // Add multiple regions as a {name: definition, name2: def2} object literal
  addRegions: function(regions){
    this.regions = _.extend({}, this.regions, regions);
    return this._buildRegions(regions);
  },

  // Remove a single region from the Layout, by name
  removeRegion: function(name){
    delete this.regions[name];
    return this.regionManager.removeRegion(name);
  },

  // Provides alternative access to regions
  // Accepts the region name
  // getRegion('main')
  getRegion: function(region) {
    return this.regionManager.get(region);
  },

  // internal method to build regions
  _buildRegions: function(regions){
    var that = this;

    var defaults = {
      regionType: Marionette.getOption(this, "regionType"),
      parentEl: function(){ return that.$el; }
    };

    return this.regionManager.addRegions(regions, defaults);
  },

  // Internal method to initialize the regions that have been defined in a
  // `regions` attribute on this layout.
  _initializeRegions: function (options) {
    var regions;
    this._initRegionManager();

    if (_.isFunction(this.regions)) {
      regions = this.regions(options);
    } else {
      regions = this.regions || {};
    }

    this.addRegions(regions);
  },

  // Internal method to re-initialize all of the regions by updating the `el` that
  // they point to
  _reInitializeRegions: function(){
    this.regionManager.closeRegions();
    this.regionManager.each(function(region){
      region.reset();
    });
  },

  // Internal method to initialize the region manager
  // and all regions in it
  _initRegionManager: function(){
    this.regionManager = new Marionette.RegionManager();

    this.listenTo(this.regionManager, "region:add", function(name, region){
      this[name] = region;
      this.trigger("region:add", name, region);
    });

    this.listenTo(this.regionManager, "region:remove", function(name, region){
      delete this[name];
      this.trigger("region:remove", name, region);
    });
  }
});


// Behavior
// -----------

// A Behavior is an isolated set of DOM /
// user interactions that can be mixed into any View.
// Behaviors allow you to blackbox View specific interactions
// into portable logical chunks, keeping your views simple and your code DRY.

Marionette.Behavior = (function(_, Backbone){
  function Behavior(options, view){
    // Setup reference to the view.
    // this comes in handle when a behavior
    // wants to directly talk up the chain
    // to the view.
    this.view = view;
    this.defaults = _.result(this, "defaults") || {};
    this.options  = _.extend({}, this.defaults, options);

    // proxy behavior $ method to the view
    // this is useful for doing jquery DOM lookups
    // scoped to behaviors view.
    this.$ = function() {
      return this.view.$.apply(this.view, arguments);
    };

    // Call the initialize method passing
    // the arguments from the instance constructor
    this.initialize.apply(this, arguments);
  }

  _.extend(Behavior.prototype, Backbone.Events, {
    initialize: function(){},

    // Setup class level proxy for triggerMethod.
    triggerMethod: Marionette.triggerMethod
  });

  // Borrow Backbones extend implementation
  // this allows us to setup a proper
  // inheritence pattern that follow in suite
  // with the rest of Marionette views.
  Behavior.extend = Marionette.extend;

  return Behavior;
})(_, Backbone);

// Marionette.Behaviors
// --------

// Behaviors is a utility class that takes care of
// glueing your behavior instances to their given View.
// The most important part of this class is that you
// **MUST** override the class level behaviorsLookup
// method for things to work properly.

Marionette.Behaviors = (function(Marionette, _) {

  function Behaviors(view) {
    // Behaviors defined on a view can be a flat object literal
    // or it can be a function that returns an object.
    this.behaviors = Behaviors.parseBehaviors(view, _.result(view, 'behaviors'));

    // Wraps several of the view's methods
    // calling the methods first on each behavior
    // and then eventually calling the method on the view.
    Behaviors.wrap(view, this.behaviors, [
      'bindUIElements', 'unbindUIElements',
      'delegateEvents', 'undelegateEvents',
      'onShow', 'onClose',
      'behaviorEvents', 'triggerMethod',
      'setElement'
    ]);
  }

  var methods = {
    setElement: function(setElement, behaviors) {
      setElement.apply(this, _.tail(arguments, 2));

      // proxy behavior $el to the view's $el.
      // This is needed because a view's $el proxy
      // is not set until after setElement is called.
      _.each(behaviors, function(b) {
        b.$el = this.$el;
      }, this);
    },

    onShow: function(onShow, behaviors) {
      var args = _.tail(arguments, 2);

      _.each(behaviors, function(b) {
        Marionette.triggerMethod.apply(b, ["show"].concat(args));
      });

      if (_.isFunction(onShow)) {
        onShow.apply(this, args);
      }
    },

    onClose: function(onClose, behaviors){
      var args = _.tail(arguments, 2);

      _.each(behaviors, function(b) {
        Marionette.triggerMethod.apply(b, ["close"].concat(args));
      });

      if (_.isFunction(onClose)) {
        onClose.apply(this, args);
      }
    },

    bindUIElements: function(bindUIElements, behaviors) {
      bindUIElements.apply(this);
      _.invoke(behaviors, bindUIElements);
    },

    unbindUIElements: function(unbindUIElements, behaviors) {
      unbindUIElements.apply(this);
      _.invoke(behaviors, unbindUIElements);
    },

    triggerMethod: function(triggerMethod, behaviors) {
      var args = _.tail(arguments, 2);
      triggerMethod.apply(this, args);

      _.each(behaviors, function(b) {
        triggerMethod.apply(b, args);
      });
    },

    delegateEvents: function(delegateEvents, behaviors) {
      var args = _.tail(arguments, 2);
      delegateEvents.apply(this, args);

      _.each(behaviors, function(b){
        Marionette.bindEntityEvents(b, this.model, Marionette.getOption(b, "modelEvents"));
        Marionette.bindEntityEvents(b, this.collection, Marionette.getOption(b, "collectionEvents"));
      }, this);
    },

    undelegateEvents: function(undelegateEvents, behaviors) {
      var args = _.tail(arguments, 2);
      undelegateEvents.apply(this, args);

      _.each(behaviors, function(b) {
        Marionette.unbindEntityEvents(this, this.model, Marionette.getOption(b, "modelEvents"));
        Marionette.unbindEntityEvents(this, this.collection, Marionette.getOption(b, "collectionEvents"));
      }, this);
    },

    behaviorEvents: function(behaviorEvents, behaviors) {
      var _behaviorsEvents = {};
      var viewUI = _.result(this, 'ui');

      _.each(behaviors, function(b, i) {
        var _events = {};
        var behaviorEvents = _.result(b, 'events') || {};
        var behaviorUI = _.result(b, 'ui');

        // Construct an internal UI hash first using
        // the views UI hash and then the behaviors UI hash.
        // This allows the user to use UI hash elements
        // defined in the parent view as well as those
        // defined in the given behavior.
        var ui = _.extend({}, viewUI, behaviorUI);

        // Normalize behavior events hash to allow
        // a user to use the @ui. syntax.
        behaviorEvents = Marionette.normalizeUIKeys(behaviorEvents, ui);

        _.each(_.keys(behaviorEvents), function(key) {
          // append white-space at the end of each key to prevent behavior key collisions
          // this is relying on the fact backbone events considers "click .foo" the same  "click .foo "
          // starts with an array of two so the first behavior has one space

          // +2 is uses becauce new Array(1) or 0 is "" and not " "
          var whitespace = (new Array(i+2)).join(" ");
          var eventKey   = key + whitespace;
          var handler    = _.isFunction(behaviorEvents[key]) ? behaviorEvents[key] : b[behaviorEvents[key]];

          _events[eventKey] = _.bind(handler, b);
        });

        _behaviorsEvents = _.extend(_behaviorsEvents, _events);
      });

      return _behaviorsEvents;
    }
  };

  _.extend(Behaviors, {

    // placeholder method to be extended by the user
    // should define the object that stores the behaviors
    // i.e.
    //
    // Marionette.Behaviors.behaviorsLookup: function() {
    //   return App.Behaviors
    // }
    behaviorsLookup: function() {
      throw new Error("You must define where your behaviors are stored. See https://github.com/marionettejs/backbone.marionette/blob/master/docs/marionette.behaviors.md#behaviorslookup");
    },

    // Takes care of getting the behavior class
    // given options and a key.
    // If a user passes in options.behaviorClass
    // default to using that. Otherwise delegate
    // the lookup to the users behaviorsLookup implementation.
    getBehaviorClass: function(options, key) {
      if (options.behaviorClass) {
        return options.behaviorClass;
      }

      // Get behavior class can be either a flat object or a method
      return _.isFunction(Behaviors.behaviorsLookup) ? Behaviors.behaviorsLookup.apply(this, arguments)[key] : Behaviors.behaviorsLookup[key];
    },

    // Maps over a view's behaviors. Performing
    // a lookup on each behavior and the instantiating
    // said behavior passing its options and view.
    parseBehaviors: function(view, behaviors){
      return _.map(behaviors, function(options, key){
        var BehaviorClass = Behaviors.getBehaviorClass(options, key);
        return new BehaviorClass(options, view);
      });
    },

    // wrap view internal methods so that they delegate to behaviors.
    // For example, onClose should trigger close on all of the behaviors and then close itself.
    // i.e.
    //
    // view.delegateEvents = _.partial(methods.delegateEvents, view.delegateEvents, behaviors);
    wrap: function(view, behaviors, methodNames) {
      _.each(methodNames, function(methodName) {
        view[methodName] = _.partial(methods[methodName], view[methodName], behaviors);
      });
    }
  });

  return Behaviors;

})(Marionette, _);


// AppRouter
// ---------

// Reduce the boilerplate code of handling route events
// and then calling a single method on another object.
// Have your routers configured to call the method on
// your object, directly.
//
// Configure an AppRouter with `appRoutes`.
//
// App routers can only take one `controller` object.
// It is recommended that you divide your controller
// objects in to smaller pieces of related functionality
// and have multiple routers / controllers, instead of
// just one giant router and controller.
//
// You can also add standard routes to an AppRouter.

Marionette.AppRouter = Backbone.Router.extend({

  constructor: function(options){
    Backbone.Router.prototype.constructor.apply(this, arguments);

    this.options = options || {};

    var appRoutes = Marionette.getOption(this, "appRoutes");
    var controller = this._getController();
    this.processAppRoutes(controller, appRoutes);
    this.on("route", this._processOnRoute, this);
  },

  // Similar to route method on a Backbone Router but
  // method is called on the controller
  appRoute: function(route, methodName) {
    var controller = this._getController();
    this._addAppRoute(controller, route, methodName);
  },

  // process the route event and trigger the onRoute
  // method call, if it exists
  _processOnRoute: function(routeName, routeArgs){
    // find the path that matched
    var routePath = _.invert(this.appRoutes)[routeName];

    // make sure an onRoute is there, and call it
    if (_.isFunction(this.onRoute)){
      this.onRoute(routeName, routePath, routeArgs);
    }
  },

  // Internal method to process the `appRoutes` for the
  // router, and turn them in to routes that trigger the
  // specified method on the specified `controller`.
  processAppRoutes: function(controller, appRoutes) {
    if (!appRoutes){ return; }

    var routeNames = _.keys(appRoutes).reverse(); // Backbone requires reverted order of routes

    _.each(routeNames, function(route) {
      this._addAppRoute(controller, route, appRoutes[route]);
    }, this);
  },

  _getController: function(){
    return Marionette.getOption(this, "controller");
  },

  _addAppRoute: function(controller, route, methodName){
    var method = controller[methodName];

    if (!method) {
      throwError("Method '" + methodName + "' was not found on the controller");
    }

    this.route(route, methodName, _.bind(method, controller));
  }
});

// Application
// -----------

// Contain and manage the composite application as a whole.
// Stores and starts up `Region` objects, includes an
// event aggregator as `app.vent`
Marionette.Application = function(options){
  this._initRegionManager();
  this._initCallbacks = new Marionette.Callbacks();
  this.vent = new Backbone.Wreqr.EventAggregator();
  this.commands = new Backbone.Wreqr.Commands();
  this.reqres = new Backbone.Wreqr.RequestResponse();
  this.submodules = {};

  _.extend(this, options);

  this.triggerMethod = Marionette.triggerMethod;
};

_.extend(Marionette.Application.prototype, Backbone.Events, {
  // Command execution, facilitated by Backbone.Wreqr.Commands
  execute: function(){
    this.commands.execute.apply(this.commands, arguments);
  },

  // Request/response, facilitated by Backbone.Wreqr.RequestResponse
  request: function(){
    return this.reqres.request.apply(this.reqres, arguments);
  },

  // Add an initializer that is either run at when the `start`
  // method is called, or run immediately if added after `start`
  // has already been called.
  addInitializer: function(initializer){
    this._initCallbacks.add(initializer);
  },

  // kick off all of the application's processes.
  // initializes all of the regions that have been added
  // to the app, and runs all of the initializer functions
  start: function(options){
    this.triggerMethod("initialize:before", options);
    this._initCallbacks.run(options, this);
    this.triggerMethod("initialize:after", options);

    this.triggerMethod("start", options);
  },

  // Add regions to your app.
  // Accepts a hash of named strings or Region objects
  // addRegions({something: "#someRegion"})
  // addRegions({something: Region.extend({el: "#someRegion"}) });
  addRegions: function(regions){
    return this._regionManager.addRegions(regions);
  },

  // Close all regions in the app, without removing them
  closeRegions: function(){
    this._regionManager.closeRegions();
  },

  // Removes a region from your app, by name
  // Accepts the regions name
  // removeRegion('myRegion')
  removeRegion: function(region) {
    this._regionManager.removeRegion(region);
  },

  // Provides alternative access to regions
  // Accepts the region name
  // getRegion('main')
  getRegion: function(region) {
    return this._regionManager.get(region);
  },

  // Create a module, attached to the application
  module: function(moduleNames, moduleDefinition){

    // Overwrite the module class if the user specifies one
    var ModuleClass = Marionette.Module.getClass(moduleDefinition);

    // slice the args, and add this application object as the
    // first argument of the array
    var args = slice.call(arguments);
    args.unshift(this);

    // see the Marionette.Module object for more information
    return ModuleClass.create.apply(ModuleClass, args);
  },

  // Internal method to set up the region manager
  _initRegionManager: function(){
    this._regionManager = new Marionette.RegionManager();

    this.listenTo(this._regionManager, "region:add", function(name, region){
      this[name] = region;
    });

    this.listenTo(this._regionManager, "region:remove", function(name, region){
      delete this[name];
    });
  }
});

// Copy the `extend` function used by Backbone's classes
Marionette.Application.extend = Marionette.extend;

// Module
// ------

// A simple module system, used to create privacy and encapsulation in
// Marionette applications
Marionette.Module = function(moduleName, app, options){
  this.moduleName = moduleName;
  this.options = _.extend({}, this.options, options);
  // Allow for a user to overide the initialize
  // for a given module instance.
  this.initialize = options.initialize || this.initialize;

  // Set up an internal store for sub-modules.
  this.submodules = {};

  this._setupInitializersAndFinalizers();

  // Set an internal reference to the app
  // within a module.
  this.app = app;

  // By default modules start with their parents.
  this.startWithParent = true;

  // Setup a proxy to the trigger method implementation.
  this.triggerMethod = Marionette.triggerMethod;

  if (_.isFunction(this.initialize)){
    this.initialize(this.options, moduleName, app);
  }
};

Marionette.Module.extend = Marionette.extend;

// Extend the Module prototype with events / listenTo, so that the module
// can be used as an event aggregator or pub/sub.
_.extend(Marionette.Module.prototype, Backbone.Events, {

  // Initialize is an empty function by default. Override it with your own
  // initialization logic when extending Marionette.Module.
  initialize: function(){},

  // Initializer for a specific module. Initializers are run when the
  // module's `start` method is called.
  addInitializer: function(callback){
    this._initializerCallbacks.add(callback);
  },

  // Finalizers are run when a module is stopped. They are used to teardown
  // and finalize any variables, references, events and other code that the
  // module had set up.
  addFinalizer: function(callback){
    this._finalizerCallbacks.add(callback);
  },

  // Start the module, and run all of its initializers
  start: function(options){
    // Prevent re-starting a module that is already started
    if (this._isInitialized){ return; }

    // start the sub-modules (depth-first hierarchy)
    _.each(this.submodules, function(mod){
      // check to see if we should start the sub-module with this parent
      if (mod.startWithParent){
        mod.start(options);
      }
    });

    // run the callbacks to "start" the current module
    this.triggerMethod("before:start", options);

    this._initializerCallbacks.run(options, this);
    this._isInitialized = true;

    this.triggerMethod("start", options);
  },

  // Stop this module by running its finalizers and then stop all of
  // the sub-modules for this module
  stop: function(){
    // if we are not initialized, don't bother finalizing
    if (!this._isInitialized){ return; }
    this._isInitialized = false;

    Marionette.triggerMethod.call(this, "before:stop");

    // stop the sub-modules; depth-first, to make sure the
    // sub-modules are stopped / finalized before parents
    _.each(this.submodules, function(mod){ mod.stop(); });

    // run the finalizers
    this._finalizerCallbacks.run(undefined,this);

    // reset the initializers and finalizers
    this._initializerCallbacks.reset();
    this._finalizerCallbacks.reset();

    Marionette.triggerMethod.call(this, "stop");
  },

  // Configure the module with a definition function and any custom args
  // that are to be passed in to the definition function
  addDefinition: function(moduleDefinition, customArgs){
    this._runModuleDefinition(moduleDefinition, customArgs);
  },

  // Internal method: run the module definition function with the correct
  // arguments
  _runModuleDefinition: function(definition, customArgs){
    // If there is no definition short circut the method.
    if (!definition){ return; }

    // build the correct list of arguments for the module definition
    var args = _.flatten([
      this,
      this.app,
      Backbone,
      Marionette,
      Marionette.$, _,
      customArgs
    ]);

    definition.apply(this, args);
  },

  // Internal method: set up new copies of initializers and finalizers.
  // Calling this method will wipe out all existing initializers and
  // finalizers.
  _setupInitializersAndFinalizers: function(){
    this._initializerCallbacks = new Marionette.Callbacks();
    this._finalizerCallbacks = new Marionette.Callbacks();
  }
});

// Type methods to create modules
_.extend(Marionette.Module, {

  // Create a module, hanging off the app parameter as the parent object.
  create: function(app, moduleNames, moduleDefinition){
    var module = app;

    // get the custom args passed in after the module definition and
    // get rid of the module name and definition function
    var customArgs = slice.call(arguments);
    customArgs.splice(0, 3);

    // Split the module names and get the number of submodules.
    // i.e. an example module name of `Doge.Wow.Amaze` would
    // then have the potential for 3 module definitions.
    moduleNames = moduleNames.split(".");
    var length = moduleNames.length;

    // store the module definition for the last module in the chain
    var moduleDefinitions = [];
    moduleDefinitions[length-1] = moduleDefinition;

    // Loop through all the parts of the module definition
    _.each(moduleNames, function(moduleName, i){
      var parentModule = module;
      module = this._getModule(parentModule, moduleName, app, moduleDefinition);
      this._addModuleDefinition(parentModule, module, moduleDefinitions[i], customArgs);
    }, this);

    // Return the last module in the definition chain
    return module;
  },

  _getModule: function(parentModule, moduleName, app, def, args){
    var options = _.extend({}, def);
    var ModuleClass = this.getClass(def);

    // Get an existing module of this name if we have one
    var module = parentModule[moduleName];

    if (!module){
      // Create a new module if we don't have one
      module = new ModuleClass(moduleName, app, options);
      parentModule[moduleName] = module;
      // store the module on the parent
      parentModule.submodules[moduleName] = module;
    }

    return module;
  },

  // ## Module Classes
  //
  // Module classes can be used as an alternative to the define pattern.
  // The extend function of a Module is identical to the extend functions
  // on other Backbone and Marionette classes.
  // This allows module lifecyle events like `onStart` and `onStop` to be called directly.
  getClass: function(moduleDefinition) {
    var ModuleClass = Marionette.Module;

    if (!moduleDefinition) {
      return ModuleClass;
    }

    // If all of the module's functionality is defined inside its class,
    // then the class can be passed in directly. `MyApp.module("Foo", FooModule)`.
    if (moduleDefinition.prototype instanceof ModuleClass) {
      return moduleDefinition;
    }

    return moduleDefinition.moduleClass || ModuleClass;
  },

  // Add the module definition and add a startWithParent initializer function.
  // This is complicated because module definitions are heavily overloaded
  // and support an anonymous function, module class, or options object
  _addModuleDefinition: function(parentModule, module, def, args){
    var fn = this._getDefine(def);
    var startWithParent = this._getStartWithParent(def, module);

    if (fn){
      module.addDefinition(fn, args);
    }

    this._addStartWithParent(parentModule, module, startWithParent);
  },

  _getStartWithParent: function(def, module) {
    var swp;

    if (_.isFunction(def) && (def.prototype instanceof Marionette.Module)) {
      swp = module.constructor.prototype.startWithParent;
      return _.isUndefined(swp) ? true : swp;
    }

    if (_.isObject(def)){
      swp = def.startWithParent;
      return _.isUndefined(swp) ? true : swp;
    }

    return true;
  },

  _getDefine: function(def) {
    if (_.isFunction(def) && !(def.prototype instanceof Marionette.Module)) {
      return def;
    }

    if (_.isObject(def)){
      return def.define;
    }

    return null;
  },

  _addStartWithParent: function(parentModule, module, startWithParent) {
    module.startWithParent = module.startWithParent && startWithParent;

    if (!module.startWithParent || !!module.startWithParentIsConfigured){
      return;
    }

    module.startWithParentIsConfigured = true;

    parentModule.addInitializer(function(options){
      if (module.startWithParent){
        module.start(options);
      }
    });
  }
});


  return Marionette;
})(this, Backbone, _);
