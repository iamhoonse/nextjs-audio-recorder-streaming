'use client';

import { useState, useRef } from 'react';

interface ResponseChunk {
  type: 'chunk' | 'complete' | 'error';
  chunkIndex?: number;
  bytes?: number;
  totalBytes?: number;
  sessionId?: string;
  totalChunks?: number;
  message?: string;
  error?: string;
}

export default function AudioRecorderStream() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Ready to record');
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [receivedChunks, setReceivedChunks] = useState<ResponseChunk[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamControllerRef = useRef<ReadableStreamDefaultController | null>(null);
  const chunkBufferRef = useRef<Uint8Array[]>([]);

  // 브라우저가 ReadableStream body를 지원하는지 확인
  const checkSupport = async () => {
    try {
      const supportsRequestStreams =
        'body' in Request.prototype &&
        typeof ReadableStream !== 'undefined';

      setIsSupported(supportsRequestStreams);
      return supportsRequestStreams;
    } catch {
      setIsSupported(false);
      return false;
    }
  };

  const startRecording = async () => {
    // 브라우저 지원 확인
    const supported = await checkSupport();
    if (!supported) {
      setStatus('❌ This browser does not support streaming request bodies');
      return;
    }

    try {
      setStatus('Requesting microphone access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // MediaRecorder 설정
      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;

      // 버퍼 초기화
      chunkBufferRef.current = [];

      // ReadableStream 생성
      const readableStream = new ReadableStream({
        start(controller) {
          streamControllerRef.current = controller;
          console.log('Stream started');

          // 버퍼에 쌓인 청크들을 먼저 전송
          if (chunkBufferRef.current.length > 0) {
            console.log(`Flushing ${chunkBufferRef.current.length} buffered chunks`);
            chunkBufferRef.current.forEach(chunk => {
              controller.enqueue(chunk);
            });
            chunkBufferRef.current = [];
          }
        },
        cancel() {
          console.log('Stream cancelled');
        }
      });

      // 오디오 청크가 준비될 때마다 스트림에 추가
      let chunkCount = 0;
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          try {
            // Blob을 ArrayBuffer로 변환
            const arrayBuffer = await event.data.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // 스트림 컨트롤러가 준비되었으면 바로 전송, 아니면 버퍼에 저장
            if (streamControllerRef.current) {
              streamControllerRef.current.enqueue(uint8Array);
              console.log(`Chunk ${chunkCount} enqueued: ${uint8Array.length} bytes`);
            } else {
              chunkBufferRef.current.push(uint8Array);
              console.log(`Chunk ${chunkCount} buffered: ${uint8Array.length} bytes`);
            }

            chunkCount++;
            setStatus(`Recording... Chunk ${chunkCount} processed (${uint8Array.length} bytes)`);
          } catch (error) {
            console.error('Error processing chunk:', error);
            setStatus(`❌ Error processing chunk ${chunkCount}`);
          }
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setStatus('Recording with ReadableStream...');
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);

        // 스트림 종료
        if (streamControllerRef.current) {
          streamControllerRef.current.close();
          streamControllerRef.current = null;
        }

        // 버퍼 클리어
        chunkBufferRef.current = [];

        mediaStream.getTracks().forEach((track) => track.stop());
        setStatus(`Recording stopped. Total chunks processed: ${chunkCount}`);
      };

      // Fetch로 스트림 전송 시작
      setStatus('Starting stream upload...');
      setReceivedChunks([]);
      setUploadStatus('Connecting to server...');

      fetch('/api/audio-stream-readable', {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/webm',
        },
        body: readableStream,
        // @ts-ignore - duplex는 아직 TypeScript에서 완전히 지원되지 않음
        duplex: 'half',
      })
        .then(async response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          // 응답 스트림 읽기
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response stream');
          }

          const decoder = new TextDecoder();
          let buffer = '';

          setUploadStatus('Receiving response stream...');

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log('Response stream complete');
              setUploadStatus('Response stream closed');
              break;
            }

            // 받은 데이터를 디코드하여 버퍼에 추가
            buffer += decoder.decode(value, { stream: true });

            // 줄바꿈으로 구분된 JSON 객체들을 파싱
            const lines = buffer.split('\n');
            // 마지막 요소는 불완전할 수 있으므로 버퍼에 유지
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const data: ResponseChunk = JSON.parse(line);

                  setReceivedChunks(prev => [...prev, data]);

                  if (data.type === 'chunk') {
                    setUploadStatus(
                      `Received server response for chunk ${data.chunkIndex}: ${data.bytes} bytes (total: ${data.totalBytes} bytes)`
                    );
                  } else if (data.type === 'complete') {
                    setUploadStatus(`✅ Complete! Session: ${data.sessionId}, Total chunks: ${data.totalChunks}`);
                    setStatus(`✅ Upload complete! Session: ${data.sessionId}, Chunks: ${data.totalChunks}`);
                  } else if (data.type === 'error') {
                    setUploadStatus(`❌ Server error: ${data.error}`);
                  }
                } catch (error) {
                  console.error('Error parsing response line:', line, error);
                }
              }
            }
          }
        })
        .catch(error => {
          console.error('Upload error:', error);

          // 특정 에러에 대한 사용자 친화적 메시지
          let errorMessage = error.message;

          if (error.message.includes('ERR_ALPN_NEGOTIATION_FAILED')) {
            errorMessage = 'HTTP/2 not available. Please use Docker setup (docker-compose up) or use Method 1.';
          } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Make sure you are using HTTPS (https://localhost) with Docker.';
          }

          setStatus(`❌ Error: ${errorMessage}`);
          setUploadStatus(`❌ Error: ${errorMessage}`);
        });

      // 1초마다 청크 생성
      mediaRecorder.start(1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      setStatus('Failed to access microphone. Please grant permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 border-2 border-purple-300 rounded-lg bg-white shadow-lg">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Audio Streaming (ReadableStream)</h2>
        {isSupported === true && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
            ✓ Supported
          </span>
        )}
        {isSupported === false && (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-semibold">
            ✗ Not Supported
          </span>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={startRecording}
          disabled={isRecording || isSupported === false}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
            isRecording || isSupported === false
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-500 hover:bg-purple-600'
          }`}
        >
          Start Streaming
        </button>

        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
            !isRecording
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          Stop Streaming
        </button>
      </div>

      <div className="w-full max-w-md">
        <div className="mb-2 text-sm text-gray-600">
          <span className="font-semibold">Recording Status:</span>
          <div className="mt-1 p-2 bg-gray-50 rounded text-xs break-words">
            {status}
          </div>
        </div>

        {uploadStatus && (
          <div className="mb-2 text-sm text-gray-600">
            <span className="font-semibold">Upload Status:</span>
            <div className="mt-1 p-2 bg-blue-50 rounded text-xs break-words">
              {uploadStatus}
            </div>
          </div>
        )}

        {receivedChunks.length > 0 && (
          <div className="mb-2 text-sm text-gray-600">
            <span className="font-semibold">Server Response Stream:</span>
            <div className="mt-1 p-2 bg-green-50 rounded text-xs max-h-40 overflow-y-auto">
              {receivedChunks.map((chunk, index) => (
                <div key={index} className="mb-1 font-mono">
                  {chunk.type === 'chunk' && (
                    <span className="text-green-700">
                      ✓ Chunk {chunk.chunkIndex}: {chunk.bytes} bytes (total: {chunk.totalBytes})
                    </span>
                  )}
                  {chunk.type === 'complete' && (
                    <span className="text-blue-700 font-semibold">
                      ✅ Complete - Session: {chunk.sessionId}, Total: {chunk.totalChunks} chunks
                    </span>
                  )}
                  {chunk.type === 'error' && (
                    <span className="text-red-700">
                      ❌ Error: {chunk.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {isRecording && (
          <div className="mt-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Streaming in progress...</span>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 text-center max-w-md">
        <p className="font-semibold mb-1">How it works:</p>
        <p>Uses Fetch API with ReadableStream body to send audio chunks</p>
        <p>in real-time without waiting for the recording to finish.</p>
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-amber-800">
          <p className="font-semibold mb-1">⚠️ Requirements:</p>
          <ul className="list-disc list-inside text-left space-y-1">
            <li>Chrome 95+ or compatible browser</li>
            <li>HTTP/2 protocol (HTTPS required)</li>
            <li>Use Docker setup: <code className="bg-amber-100 px-1 rounded">docker-compose up</code></li>
            <li>Access via: <code className="bg-amber-100 px-1 rounded">https://localhost</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
