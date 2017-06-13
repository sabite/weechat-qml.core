/*
 * Copyright 2017 Tavy
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


.import 'color.js' as Color

function _send(data) {
    call('weechat.send', [data])
}

function connect(uri, password) {
    call('weechat.connect', [uri, password])
}

function input(buffer, data) {
    var lines = data.split('\n')
    for (var i=0; i<lines.length; ++i) {
        var line = lines[i];
        _send('input ' + buffer +' '+line+'\n');
    }
}

//var _urlR = /[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
var _urlR = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g
function _quote_html(text) {
    var text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return text.replace(_urlR, function(url) { return '<a href="'+url+'">'+url+'</a>' });
}

function _colorize_line(line) {
    var prefix_html = [];
    var prefix = Color.parse(line.prefix) || [];
    for (var i=0; i<prefix.length; ++i) {
        var fragment = '<font color="' + prefix[i].fg+'">' + _quote_html(prefix[i].text) + '</font>'
        prefix_html.push(fragment);
    }

    line.prefix = prefix.map(function(fragment) { return fragment.text||'' }).join('');
    line.prefix_html = prefix_html.join('');

    var message_html = [];
    var message = Color.parse(line.message);
    for (var i=0; i<message.length; ++i) {
        var fragment = '<font color="' + message[i].fg+'">' + _quote_html(message[i].text) + '</font>'
        message_html.push(fragment);
    }

    line.message = message.map(function(fragment) { return fragment.text||'' }).join('');
    line.message_html = message_html.join('');
}

function _colorize_buffer(buffer) {
    if (!buffer.title) {
        buffer.title_html = null;
        return;
    }

    var title_html = [];
    var title = Color.parse(buffer.title)||[];
    for (var i=0; i<title.length; ++i) {
        var fragment = '<font color="' + title[i].fg+'">' + _quote_html(title[i].text) + '</font>'
        title_html.push(fragment);
    }

    buffer.title = title.map(function(fragment) { return fragment.text||'' }).join('');
    buffer.title_html = title_html.join('');
}


var _loaded = {};
var _loading = {};
function loadBufferLines(buffer) {
    /* Only load once */
    if (_loaded[buffer.pointer])
        return;
    _loaded[buffer.pointer] = true;

    _send('(buffer_lines_loaded) hdata buffer:'+buffer.pointer+'/lines/last_line(-50)/data\n');
}

function loadMoreBufferLines(buffer) {
    if (!_loaded[buffer.pointer]) {
        loadBufferLines(buffer);
        return;
    }

    /* Debounce */
    if (_loading[buffer.pointer])
        return;
    _loading[buffer.pointer] = true;

    var earliest = buffer.lines.get(0);
    if (!earliest && !earliest.line_pointer) {
        /* no more to load. don't unset loading so next time this'll
         * short-circuit */
        return;
    }

    var last = earliest.line_pointer;
    _send('(buffer_lines_loaded) hdata line:'+last+'(-50)/data\n');
}

function markBufferRead(buffer) {
    //_send(buffer.pointer, 'input '+buffer.pointer+' /buffer set hotlist -1\n')
    input(buffer.pointer, '/buffer set hotlist -1');
    var hot_count = {
        'low': 0,
        'msg': 0,
        'priv': 0,
        'high': 0
    }
    buffers.updateBuffer(buffer.pointer, {hot_count: hot_count});
}

function onListBuffers(buffers) {
    for (var i=0; i< buffers.length; ++i) {
        _colorize_buffer(buffers[i])
    }
    weechat.buffers.addAllBuffers(buffers);
}

function onBufferOpened(buffer) {
    _colorize_buffer(buffer);
    weechat.buffers.addBuffer(buffer);
}
function onBufferUpdated(buffer) {
    var pointer = buffer.__path[0];
    delete buffer.__path;

    weechat.buffers.updateBuffer(pointer, buffer);
}
function onBufferClosing(buffer) {
    var pointer = buffer.__path[0];
    weechat.buffers.removeBuffer(pointer);
}

function onHotlist(hotlist) {
    for (var i=0; i<hotlist.length; ++i) {
        var count = hotlist[i].count;
        var hot_count = {
            'low': count[0],
            'msg': count[1],
            'priv': count[2],
            'high': count[3],
        }
        buffers.updateBuffer(hotlist[i].buffer, {hot_count: hot_count});
    }
}

function _process_tags(line) {
    for (var i=0; i<line.tags_array.length; ++i) {
        var tag = line.tags_array[i];
        
        if (tag.substr(0, 7) == "notify_") {
            line.notify  = tag.substr(7);
        } else if (tag.substr(0, 5) == "nick_") {
            line.nick = tag.substr(5)
        }
    }
}

function onBufferLineAdded(line) {
    var buffer = buffers.getBuffer(line.buffer)

    if (buffer) {
        line.data_pointer = line.__path.pop();
        delete line.__path;

        _colorize_line(line);
        _process_tags(line);
        buffer.lines.append(line)

        var hot_count = {
            'low': buffer.hot_count.low,
            'msg': buffer.hot_count.msg,
            'priv': buffer.hot_count.priv,
            'high': buffer.hot_count.high,
        }
       
        
        switch (line.notify) {
            case "none":
            break;
            
            case "highlight":
            hot_count.high += 1;
            highlight(line, buffer);
            break;
            
            case "private":
            hot_count.priv += 1;
            highlight(line, buffer)
            break;
            
            case "message":
            hot_count.msg += 1;
            break;
            
            default:
            hot_count.low += 1;
        }

        buffers.updateBuffer(buffer.pointer, {hot_count: hot_count});
    }
}

function onBufferLinesLoaded(lines) {
    var buffer = buffers.getBuffer(lines[0].buffer);

    for (var i=0; i<lines.length; ++i) {
        var line = lines[i];
        line.data_pointer = line.__path.pop();
        line.line_pointer = line.__path.pop();
        delete line.__path;
    }

    var last = 0;

    var first = buffer.lines.get(0);
    if (first) {
        for (var i=0; i<lines.length; ++i) {
            var line = lines[i];
            if (line.data_pointer == first.data_pointer) {
                last = ++i;
                break;
            }
        }
    }

    for (var i=last; i<lines.length; ++i) {
        var line = lines[i];
        _process_tags(line);
        _colorize_line(line);
        buffer.lines.insert(0, line);
    };

    weechat.loadedLines(buffer.pointer, lines.length - last);

    _loading[buffer.pointer] = false;
}
