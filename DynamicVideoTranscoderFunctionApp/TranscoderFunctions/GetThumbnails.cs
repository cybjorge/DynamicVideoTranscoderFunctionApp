using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace DynamicVideoTranscoderFunctionApp.TranscoderFunctions
{
    public static class GetThumbnails
    {
        [FunctionName("GetThumbnails")]
        public static async Task<IActionResult> Run(
            [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = "get-thumbnails")] HttpRequest req,
            ILogger log)
        {
            log.LogInformation("C# HTTP trigger function processed a request.");
            var response = new List<VideoData>();

            string connectionString = Environment.GetEnvironmentVariable("SqlConnectionString"); // You should replace "YourConnectionString" with your actual connection string key in appsettings.json
            using (SqlConnection connection = new SqlConnection(connectionString))
            {
                await connection.OpenAsync(); // Use async version of Open method

                using (SqlCommand command = connection.CreateCommand())
                {
                    command.CommandText = "SELECT id, videoName, thumbnailurl FROM [dbo].[DPVideoMetaData]";

                    using (SqlDataReader reader = await command.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            var videoData = new VideoData
                            {
                                videoId = reader["id"].ToString(),
                                videoName = reader["videoName"].ToString(),
                                thumbnailUrl = reader["thumbnailurl"].ToString()
                            };
                            response.Add(videoData);
                        }
                    }
                }
            }

            return new OkObjectResult(response);
        }
    }

    public class VideoData
    {
        public string videoId { get; set; }
        public string videoName { get; set; }
        public string thumbnailUrl { get; set; }
    }
}
