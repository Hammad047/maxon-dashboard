"""
WebSocket endpoint for lightweight live updates.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        # Simple echo/ping loop so clients can keep a live connection.
        while True:
            msg = await ws.receive_text()
            if msg.lower() == "ping":
                await ws.send_text("pong")
            else:
                await ws.send_text(msg)
    except WebSocketDisconnect:
        return

