using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

public static class EncryptionHelper
{
    private static string? _key;

    public static void Initialize(IConfiguration config)
    {
        _key =
            Environment.GetEnvironmentVariable("DB_PASSWORD_ENCRYPTION_KEY")
            ?? config["Encryption:DbPasswordKey"]
            ?? throw new InvalidOperationException("DB encryption key not configured");
    }

    private static byte[] GetKeyBytes()
    {
        return Encoding.UTF8.GetBytes(_key!.PadRight(32));
    }

    public static string Encrypt(string plainText)
    {
        using var aes = Aes.Create();
        aes.Key = GetKeyBytes();
        aes.GenerateIV(); // 🔥 random IV

        using var encryptor = aes.CreateEncryptor();

        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

        // store IV + cipher together
        var combined = new byte[aes.IV.Length + cipherBytes.Length];
        Buffer.BlockCopy(aes.IV, 0, combined, 0, aes.IV.Length);
        Buffer.BlockCopy(cipherBytes, 0, combined, aes.IV.Length, cipherBytes.Length);

        return Convert.ToBase64String(combined);
    }

    public static string Decrypt(string cipherText)
    {
        var combined = Convert.FromBase64String(cipherText);

        using var aes = Aes.Create();
        aes.Key = GetKeyBytes();

        var iv = new byte[16];
        var cipherBytes = new byte[combined.Length - 16];

        Buffer.BlockCopy(combined, 0, iv, 0, 16);
        Buffer.BlockCopy(combined, 16, cipherBytes, 0, cipherBytes.Length);

        aes.IV = iv;

        using var decryptor = aes.CreateDecryptor();
        var plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);

        return Encoding.UTF8.GetString(plainBytes);
    }

}
