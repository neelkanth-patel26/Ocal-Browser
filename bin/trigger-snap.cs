using System;
using System.Runtime.InteropServices;
using System.Threading;

class Program {
    [DllImport("user32.dll")]
    static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    const byte VK_LWIN = 0x5B;
    const byte VK_Z = 0x5A;
    const byte VK_ESCAPE = 0x1B;
    const uint KEYEVENTF_KEYUP = 0x0002;

    static void Main(string[] args) {
        if (args.Length > 0 && args[0].ToLower() == "dismiss") {
            keybd_event(VK_ESCAPE, 0, 0, UIntPtr.Zero);
            keybd_event(VK_ESCAPE, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
            return;
        }

        int delay = 50;
        if (args.Length > 0) {
            int.TryParse(args[0], out delay);
        }
        if (delay > 0) {
            Thread.Sleep(delay);
        }
        keybd_event(VK_LWIN, 0, 0, UIntPtr.Zero);
        keybd_event(VK_Z, 0, 0, UIntPtr.Zero);
        keybd_event(VK_Z, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_LWIN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }
}
