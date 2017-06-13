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
.import 'line.js' as Line
.import 'buffer.js' as Buffer
.import 'hotlist.js' as Hotlist

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

function loadMoreBufferLines(buffer) {
    Line.loadMore(buffer);
}

function markBufferRead(buffer) {
    Hotlist.markRead(buffer);
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


function init() {
    setHandler('_buffer_line_added', function(msgs) {
        var line = msgs[0].values[0];

        Line.onBufferLineAdded(line);
    });

    setHandler('buffer_lines_loaded', function(msgs) {
        var buffers = msgs[0].values;

        Line.onBufferLinesLoaded(buffers);
    });
    setHandler('hotlist', function(msgs) {
        var hotlist = msgs[0].values;
        Hotlist.onHotlist(hotlist);
    });

    setHandler('_buffer_localvar_added', function(msgs) {
        var buffer = msgs[0].values[0];
        Buffer.update(buffer);
    });
    setHandler('_buffer_localvar_changed', function(msgs) {
        var buffer = msgs[0].values[0];
        Buffer.update(buffer);
    });
    setHandler('_buffer_localvar_added', function(msgs) {
        var buffer = msgs[0].values[0];
        Buffer.update(buffer);
    });

    setHandler('_buffer_title_changed', function(msgs) {
        var buffer = msgs[0].values[0];
        var ptr = buffer.__path[0];
        Buffer.colorize(buffer);
        buffers.getBuffer(ptr).title = buffer.title;
        buffers.getBuffer(ptr).title_html = buffer.title_html;
    });

    setHandler('list_buffers', function(msgs) {
        var buffers = msgs[0].values;
        for (var i=0; i< buffers.length; ++i) {
            Buffer.colorize(buffers[i])
        }

        weechat.buffers.addAllBuffers(buffers);
    });
}

function loadBufferLines(buffer) {
    Line.loadInitial(buffer);
}
