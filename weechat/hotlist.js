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

function update(buffer, line) {
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

function markRead(buffer) {
    input(buffer.pointer, '/buffer set hotlist -1');
    var hot_count = {
        'low': 0,
        'msg': 0,
        'priv': 0,
        'high': 0
    }
    buffers.updateBuffer(buffer.pointer, {hot_count: hot_count});
}
