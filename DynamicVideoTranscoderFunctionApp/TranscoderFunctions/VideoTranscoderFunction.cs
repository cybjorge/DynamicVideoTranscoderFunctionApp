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
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Text.Json;

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

            string videoId = data?.videoId;
            string sessionID = data?.sessionID;
            string videoStrategy = data?.videoStrategy;
            string startTimestamp = data?.startTimestamp;


            // Validate input parameters and return error if any of them is missing or invalid
            if (string.IsNullOrEmpty(videoId))
            {
                return new BadRequestObjectResult("Please provide a video ID.");
            }

            try
            {
                // Fetch blob URL and SAS URL from the database based on video ID
                (string blobUrl, string sasUrl) = GetBlobAndSasUrlsFromDatabase(videoId);

                // FFmpeg command to transcode video
                string ffmpegArgs = $"-i {blobUrl + "?" + sasUrl} -ss 00:00:00 -t 10 -vf scale=1920x1080 -c:v libvpx -crf 15 -b:v 1M -c:a libvorbis -f webm -";

                var response = new List<FileContentResult>();
                // Start FFmpeg process
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

                    int index = 0;
                    // Read the transcoded video from the standard output of FFmpeg
                    using (var memoryStream = new MemoryStream())
                    {
                        await process.StandardOutput.BaseStream.CopyToAsync(memoryStream);

                        // Reset memory stream position to the beginning
                        memoryStream.Position = 0;
                        byte[] fileBytes = memoryStream.ToArray();

                        // Create FileContentResult for each transcoded video
                        log.LogInformation($"Transcoding duration: {process.StartTime - process.ExitTime}");
                        
                        //return new FileContentResult(fileBytes, "video/webm");
                        //for (int i = 0; i < 5; i++)
                        //{
                        //    response.Add(new FileContentResult(fileBytes, "video/webm"));
                        //}

                        var transcodedVideoResponse = new TranscodedVideoResponse
                        {
                            VideoContentBase64 = Convert.ToBase64String(fileBytes),
                            EndTimestamp = DateTime.UtcNow, // Set end timestamp
                            Duration = process.ExitTime - process.StartTime // Calculate duration
                        };

                        // Serialize the transcoded video response to JSON
                        string jsonResponse = JsonSerializer.Serialize(transcodedVideoResponse);

                        // Return the JSON response
                        return new ContentResult
                        {
                            Content = jsonResponse,
                            ContentType = "application/json",
                            StatusCode = 200
                        };
                    }
                }

                // Return the list of transcoded videos
                return new OkObjectResult(response);
            }
            catch (Exception ex)
            {
                return new BadRequestObjectResult($"Error transcoding video: {ex.Message}");
            }
        }

        private static (string, string) GetBlobAndSasUrlsFromDatabase(string videoId)
        {
            string connectionString = Environment.GetEnvironmentVariable("SqlConnectionString"); // Replace with your connection string
            string blobUrl = "";
            string sasUrl = "";

            using (SqlConnection connection = new SqlConnection(connectionString))
            {
                connection.Open();

                using (SqlCommand command = connection.CreateCommand())
                {
                    command.CommandText = "SELECT blobUrl, sasUrl FROM DPVideoMetaData WHERE id = @VideoId";
                    command.Parameters.AddWithValue("@VideoId", videoId);

                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            blobUrl = reader["blobUrl"].ToString();
                            sasUrl = reader["sasUrl"].ToString();
                        }
                    }
                }
            }

            return (blobUrl, sasUrl);
        }
        public class TranscodedVideoResponse
        {
            public string VideoContentBase64 { get; set; }
            public DateTime EndTimestamp { get; set; }
            public TimeSpan Duration { get; set; }
        }
    }
}
