using System.IO;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System.Diagnostics;
using System;
using System.Text;



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
                return new BadRequestObjectResult("Please provide a video URL.");
            }
            try
            {
                // FFmpeg command to transcode video
                string ffmpegArgs = $"-i {videoUrl} -vf scale=256x144 -c:v libvpx -crf 10 -b:v 1M -c:a libvorbis -f webm -";

                using (var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "C:\\Users\\samba\\source\\repos\\DynamicVideoTranscoderFunctionApp\\ffmpeg\\bin\\ffmpeg.exe",
                        Arguments = ffmpegArgs,
                        RedirectStandardOutput = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    }
                })
                {
                    process.Start();

                    using (var memoryStream = new MemoryStream())
                    {

                        await process.StandardOutput.BaseStream.CopyToAsync(memoryStream);



                        // Reset memory stream position to the beginning
                        memoryStream.Position = 0;

                        byte[] fileBytes = memoryStream.ToArray();


                        return new FileContentResult(fileBytes, "video/webm");


                    }
                }
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Error transcoding video: {ex.Message}");
            }
        }
    }
}