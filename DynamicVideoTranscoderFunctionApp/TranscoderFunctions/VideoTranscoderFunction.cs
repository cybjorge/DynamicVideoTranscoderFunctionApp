using System.IO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System.Diagnostics;



namespace DynamicVideoTranscoderFunctionApp.TranscoderFunctions
{
    public static class VideoTranscoderFunction
    {
        [FunctionName("TranscodeVideo")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "transcode-video")] HttpRequest req,
            ILogger log)
        {
            log.LogInformation("C# HTTP trigger function processed a request.");

            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            dynamic data = Newtonsoft.Json.JsonConvert.DeserializeObject(requestBody);

            string videoUrl = data?.videoUrl;

            if (string.IsNullOrEmpty(videoUrl))
            {
                return new BadRequestObjectResult("Please provide a valid 'videoUrl' in the request body.");
            }

            // Transcode video using FFmpeg
            return TranscodeAndReturn(videoUrl, log);
        }

        private static IActionResult TranscodeAndReturn(string videoUrl, ILogger log)
        {
            using (Process process = new Process())
            {
                process.StartInfo.FileName = "ffmpeg";
                process.StartInfo.Arguments = $"-i {videoUrl} -c:v libx264 -c:a aac -strict experimental -b:a 192k -f mp4 -";
                process.StartInfo.RedirectStandardOutput = true;
                process.StartInfo.RedirectStandardError = true;
                process.StartInfo.UseShellExecute = false;
                process.StartInfo.CreateNoWindow = true;

                process.Start();

                byte[] outputBytes = process.StandardOutput.BaseStream.ToByteArray();

                process.WaitForExit();

                if (process.ExitCode != 0)
                {
                    log.LogError($"FFmpeg failed with code {process.ExitCode}: {process.StandardError.ReadToEnd()}");
                    return new BadRequestObjectResult("Video transcoding failed.");
                }

                return new FileContentResult(outputBytes, "video/mp4");
            }
        }

        public static byte[] ToByteArray(this Stream stream)
        {
            using (MemoryStream memoryStream = new MemoryStream())
            {
                stream.CopyTo(memoryStream);
                return memoryStream.ToArray();
            }
        }
    }
}
