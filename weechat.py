# Copyright 2017 Tavy
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from threading import Thread
import asyncio
import websockets
import protocol as w
import pyotherside

loop = asyncio.new_event_loop()


def f(loop):
    asyncio.set_event_loop(loop)
    loop.run_forever()
Thread(target=f, args=(loop,)).start()


@asyncio.coroutine
def _connect(uri, password):
    global conn
    conn = yield from websockets.connect(uri)
    yield from conn.send(w.init(password))
    yield from conn.send('(list_buffers) hdata buffer:gui_buffers(*) full_name,short_name,title,nicklist,type,local_variables,completion\n')
    yield from conn.send('(hotlist) hdata hotlist:gui_hotlist(*) count,buffer\n')
    yield from conn.send('sync *\n')
    yield from conn.send('ping connected\n')

    while True:
        data = yield from conn.recv()
        if not data:
            pyotherside.emit('disconnected')
            return
        id, msg = w.parse_message(data)
        print(id)
        pyotherside.send(id, msg)

conn = None


def connect(uri, password):
    coro = _connect(uri, password)
    loop.call_soon_threadsafe(asyncio.async, coro)


@asyncio.coroutine
def _send(data):
    print(data)
    yield from conn.send(data)


def send(data):
    loop.call_soon_threadsafe(asyncio.async, _send(data))
