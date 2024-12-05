import { useEffect } from 'react';

export default function usePreventDefaultDragDrop() {
  useEffect(() => {
    const preventDefault = (e: Event) => {
      e.preventDefault();
    };

    // Prevent default drag behaviors
    window.addEventListener('dragenter', preventDefault);
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);

    return () => {
      window.removeEventListener('dragenter', preventDefault);
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);
};
