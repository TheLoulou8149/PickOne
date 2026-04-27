import { useEffect, useRef, useCallback } from 'react';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

declare const __DEV__: boolean;

const AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : 'ca-app-pub-4556627511404731/5554674653';

// TEMPORAIRE — à retirer une fois le compte AdMob activé (48h)
const USE_TEST_ADS = true;

export function useInterstitialAd() {
  const adRef = useRef(
    InterstitialAd.createForAdRequest(USE_TEST_ADS ? TestIds.INTERSTITIAL : AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    })
  );

  useEffect(() => {
    const unsub = adRef.current.addAdEventListener(AdEventType.LOADED, () => {});
    adRef.current.load();
    return unsub;
  }, []);

  const showAd = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const ad = adRef.current;
      if (!ad.loaded) {
        resolve();
        return;
      }

      const unsubClose = ad.addAdEventListener(AdEventType.CLOSED, () => {
        unsubClose();
        ad.load();
        resolve();
      });

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        unsubError();
        resolve();
      });

      ad.show();
    });
  }, []);

  return { showAd };
}
