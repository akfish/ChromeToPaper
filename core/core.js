//core.js

var core= {
  'log': {
  },
  'badge': {
    'timer':0
  },
  'msg':0
};

//setDefaults: set default options if they are unset
core.setDefaults=function() {
  core.setDefault('opt_feedback','badge');
  core.setDefault('opt_contextmenu','true');
  core.setDefault('opt_notiftimeout','5');
}

//setDefault: set option if unset
core.setDefault=function(key,val) {
  if(localStorage.getItem(key)==null) {
    localStorage[key]=val;
  }
}

//badge.clear: Clears the browser badge
core.badge.clear=function() {
  clearInterval(core.badge.timer);
  chrome.browserAction.setBadgeText({
    'text':''
  });
}

//badge.setPersistent: Sets a browser badge until cleared
core.badge.setPersistent=function(color,msg) {
  clearInterval(core.badge.timer);
  chrome.browserAction.setBadgeBackgroundColor({
    'color':color
  });
  chrome.browserAction.setBadgeText({
    'text':msg
  });
}

//badge.setDefault: Sets a browser badge that behaves based on user settings
core.badge.setDefault=function(color,msg) {
  clearInterval(core.badge.timer);
  chrome.browserAction.setBadgeBackgroundColor({
    'color':color
  });
  chrome.browserAction.setBadgeText({
    'text':msg
  });
  
  setInterval(core.badge.clear,5000)
  //To Implement: custom timer
  /*if(parseInt(localStorage['opt_notiftimeout'])>0) {
    setInterval(core.badge.clear,parseInt(localStorage['opt_notiftimeout']));
  }*/
}

//notif: Creates a notification
core.notif=function(img,msg) {
  var notif=webkitNotifications.createNotification(
    img,
    'ChromeToPaper',
    msg
  );
  if(parseInt(localStorage['opt_notiftimeout'])>0) {
    setTimeout(function() {
      notif.cancel();
    },parseInt(localStorage['opt_notiftimeout'])*1000);
  }
  notif.show();
}

//resp: Creates a response based on user setting
core.resp=function(type,msg) {
  if(localStorage['opt_feedback']=='notif') {
    var img=0;
    if(type=='error') img='error.png';
    else if(type=='auth') img='auth.png'
    else if(type=='success') img='success.png';
    core.notif(img,msg[0]);
  } else {
    var color=[0,102,153,128];
    if(type=='error') color=[255,0,0,200];
    else if(type=='auth') color=[0,102,153,128];
    else if(type='success') color=[0,255,0,128];
    core.badge.setDefault(color,msg[1]);
  }
}

//click: Handler for browser button click
core.click=function(t) {
  if(core.msg) {
    core.msg=0;
    localStorage['version']=core.version;
    chrome.tabs.create({
      'url':'welcome.html',
      selected:true
    });
    core.badge.clear();
  } else if(t.url=='chrome://newtab/') {
    core.badge.setDefault([0,255,0,128],'site');
    chrome.tabs.update(t.id,{
      'url':'http://instapaper.com/',
      selected:true
    });
  } else {
    if(localStorage['opt_feedback']=='badge') {
      core.badge.setDefault([0,102,153,128],'...');
    }
    core.saveToInstapaper(t.url);
  }
};

//saveToInstapaper: Sends request
core.saveToInstapaper=function(url) {
  apiRemote.sendAdd(url,function(status) {
    core.handleStatus(status);
  });
}

//handleStatus: Outputs status
core.handleStatus=function(status) {
  if(status==201) {
    core.resp('success',[
      'Success!',
      '+1'
    ]);
  } else if(status==403) {
    core.resp('auth',[
      code_error[status],
      'auth'
    ]);
    chrome.tabs.create({
      'url':'options.html#auth',
      'selected':true
    });
  } else if(code_error[status]) {
    core.resp('error',[
      code_error[status],
      status
    ]);
  } else {
    core.resp('error',[
      'Unspecified Error '+status,
      status
    ]);
  }
}

//hook: Adds listeners
core.hook=function() {
  chrome.browserAction.onClicked.addListener(core.click);
  chrome.extension.onRequestExternal.addListener(
    function(data,from,callback) {
      if(family[sender.id]) {
        if(core.log[sender.id]) {
          core.log[sender.id]++;
        } else {
          core.log[sender.id]=1;
        }

        switch(data.task) {
          case 'saveToInstapaper':
            core.saveToInstapaper(data.url);
            break;
          case 'openInstapaperList':
            core.openInstapaperList();
            break;
          default:
            console.warn('Unknown External Task: '+data.task);
        }
      } else {
        console.warn('Unrecognized Extension ID: '+sender.id);
      }
    }
  );
  if(localStorage['opt_contextoption']) {
    chrome.contextMenus.create({
      'title':'ChromeToPaper',
      'contexts': [
        'link'
      ],
      'onclick':function(info,tab) {
        core.saveToInstapaper(info.linkUrl);
      }
    });
  }
}

core.hook();