import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { api } from '@/api/client';
import { Colors } from '@/constants/theme';

interface Props {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}

interface RpSignatureResponse {
  app_id: string;
  action: string;
  rp_context: {
    content: string;
    timestamp: string;
    signature: string;
  };
}

export function WorldIdVerify({ open, onClose, onVerified }: Props) {
  const [rpData, setRpData] = useState<RpSignatureResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setRpData(null);
      setError(null);
      return;
    }

    setLoading(true);
    api
      .get<RpSignatureResponse>('/worldid/rp-signature')
      .then(setRpData)
      .catch(() => setError('Failed to initialize verification'))
      .finally(() => setLoading(false));
  }, [open]);

  const handleMessage = async (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'verification-success') {
        await api.post('/worldid/verify', data.proof);
        onVerified();
        onClose();
      } else if (data.type === 'verification-error') {
        setError(data.message || 'Verification failed');
      } else if (data.type === 'close') {
        onClose();
      }
    } catch {
      setError('Verification failed');
    }
  };

  const buildHtml = (rp: RpSignatureResponse) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.worldcoin.org/idkit/v1.3.0/idkit-standalone.js"></script>
  <style>
    body {
      margin: 0;
      background: #0d0d12;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      color: #f0e6db;
    }
    .container { text-align: center; padding: 24px; }
    .status { margin-top: 16px; font-size: 14px; color: #999; }
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 32px;
      border-radius: 12px;
      background: linear-gradient(135deg, #f43f5e, #ff2d78);
      color: #fff;
      font-weight: 700;
      font-size: 16px;
      border: none;
      cursor: pointer;
    }
    .close-btn {
      margin-top: 16px;
      padding: 8px 24px;
      border-radius: 999px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.1);
      color: #999;
      cursor: pointer;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Verify with World ID</h2>
    <p class="status">Tap the button below to verify your identity.</p>
    <button class="btn" id="verify-btn" onclick="startVerification()">
      Verify with World ID
    </button>
    <br/>
    <button class="close-btn" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:'close'}))">
      Cancel
    </button>
  </div>
  <script>
    async function startVerification() {
      const btn = document.getElementById('verify-btn');
      btn.textContent = 'Opening World ID...';
      btn.disabled = true;
      try {
        if (window.IDKit) {
          window.IDKit.init({
            app_id: '${rp.app_id}',
            action: '${rp.action}',
            rp_context: ${JSON.stringify(rp.rp_context)},
            allow_legacy_proofs: true,
            handleVerify: function(proof) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'verification-success',
                proof: proof
              }));
            },
            onSuccess: function() {},
            onError: function(err) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'verification-error',
                message: err
              }));
            }
          });
          window.IDKit.open();
        } else {
          // Fallback: open World ID deeplink
          const worldAppUrl = 'https://worldcoin.org/verify?app_id=${rp.app_id}&action=${rp.action}';
          window.location.href = worldAppUrl;
        }
      } catch(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'verification-error',
          message: e.message || 'Failed to start verification'
        }));
      }
    }
  </script>
</body>
</html>`;

  if (!open) return null;

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.rose500} />
            <Text style={styles.loadingText}>Initializing...</Text>
          </View>
        )}

        {error && (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}

        {rpData && !loading && !error && (
          <WebView
            source={{ html: buildHtml(rpData) }}
            style={styles.webview}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={[styles.centered, StyleSheet.absoluteFill]}>
                <ActivityIndicator size="large" color={Colors.rose500} />
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d12',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  errorText: {
    fontSize: 16,
    color: '#f0e6db',
    textAlign: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#999',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0d0d12',
  },
});
