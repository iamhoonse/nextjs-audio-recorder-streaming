import AudioRecorder from '@/components/AudioRecorder';
import AudioRecorderStream from '@/components/AudioRecorderStream';

export default function Home() {
  return (
    <div className="font-sans flex items-center justify-center min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="flex flex-col gap-8 items-center max-w-6xl">
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Next.js Audio Streaming
          </h1>
          <p className="text-gray-600">
            Real-time audio recording with HTTP streaming
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
          <AudioRecorder />
          <AudioRecorderStream />
        </div>

        <div className="mt-8 p-6 bg-white rounded-lg shadow-md w-full">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Implementation Comparison:</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold text-green-700 mb-2">Method 1: Individual POST Requests</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                <li>✅ Works in all modern browsers</li>
                <li>✅ Simple and reliable</li>
                <li>✅ Easy error handling per chunk</li>
                <li>✅ Independent chunk processing</li>
                <li>⚠️ Multiple HTTP connections</li>
              </ul>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold text-purple-700 mb-2">Method 2: ReadableStream Body</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                <li>✅ Single HTTP connection</li>
                <li>✅ True streaming (continuous)</li>
                <li>✅ Lower overhead</li>
                <li>⚠️ Chrome 95+ only</li>
                <li>⚠️ Limited browser support</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded text-sm text-gray-700">
            <p className="font-semibold mb-2">📚 Technical Details:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Both methods use MediaRecorder API to capture audio in 1-second chunks</li>
              <li>Server saves chunks in <code className="bg-gray-100 px-2 py-1 rounded">uploads/</code> directory</li>
              <li>ReadableStream method uses <code className="bg-gray-100 px-2 py-1 rounded">fetch()</code> with streaming request body</li>
              <li>Both methods support real-time processing (STT, transcoding, etc.)</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
