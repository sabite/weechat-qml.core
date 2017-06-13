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

//var _urlR = /[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
var _urlR = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g
function _quote_html(text) {
    var text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return text.replace(_urlR, function(url) { return '<a href="'+url+'">'+url+'</a>' });
}

function colorize(buffer) {
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
        colorize(buffers[i])
    }
    weechat.buffers.addAllBuffers(buffers);
}

function opened(buffer) {
    colorize(buffer);
    weechat.buffers.addBuffer(buffer);
}
function update(buffer) {
    var pointer = buffer.__path[0];
    delete buffer.__path;

    if (buffer.title) {
        colorize(buffer);
    }

    weechat.buffers.updateBuffer(pointer, buffer);
}
function closing(buffer) {
    var pointer = buffer.__path[0];
    weechat.buffers.removeBuffer(pointer);
}
