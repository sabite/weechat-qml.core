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
.import 'hotlist.js' as Hotlist

//var _urlR = /[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
var _urlR = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.,~#?&//=]*)/g
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

    //console.log(JSON.stringify(message))
    line.message = message.map(function(fragment) { return fragment.text||'' }).join('');
    line.message_html = message_html.join('');
}


function _process_tags(line) {
    line.notify = line.nick = null;

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
        Hotlist.update(buffer, line);

        bufferLineAdded(buffer, line);
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

    loading[buffer.pointer] = false;
    weechat.loadedLines(buffer.pointer, lines.length - last);
}

var loaded = {};
var loading = {};
function loadInitial(buffer) {
    /* Only load once */
    if (loaded[buffer.pointer])
        return;
    loaded[buffer.pointer] = true;

    weechat.send('(buffer_lines_loaded) hdata buffer:'+buffer.pointer+'/lines/last_line(-50)/data\n');
}

function loadMore(buffer) {
    if (!loaded[buffer.pointer]) {
        loadInitial(buffer);
        return;
    }

    /* Debounce */
    if (loading[buffer.pointer])
        return;
    loading[buffer.pointer] = true;

    var earliest = buffer.lines.get(0);
    if (!earliest && !earliest.line_pointer) {
        /* no more to load. don't unset loading so next time this'll
         * short-circuit */
        return;
    }

    var last = earliest.line_pointer;
    weechat.send('(buffer_lines_loaded) hdata line:'+last+'(-50)/data\n');
}
