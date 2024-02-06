using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;
using Microsoft.WindowsAzure.Storage.Blob;
using Newtonsoft.Json;
using Azure.Storage.Blobs.Specialized;

namespace DynamicVideoTranscoderFunctionApp.TranscoderFunctions
{
    public static class GetThumbnailsFunction
    {
        [FunctionName("GetThumbnails")]
        public static async Task<IActionResult> Run(
                    [HttpTrigger(AuthorizationLevel.Function, "get", Route = "get-thumbnails")] HttpRequest req,
                    [Blob("thumbnails", FileAccess.Read, Connection = "AzureWebJobsStorage")] IEnumerable<BlobBaseClient> blobs,
                    ILogger log)
        {
            log.LogInformation("C# HTTP trigger function processed a request.");

            try
            {
                // Convert the list of blobs to a list of URLs
                var thumbnailUrls = blobs.Select(blob => blob.Uri.ToString()).ToList();

                // Return the list of thumbnail URLs as JSON
                return new OkObjectResult(thumbnailUrls);
            }
            catch (Exception ex)
            {
                log.LogError($"Error: {ex.Message}");
                return new StatusCodeResult(500); // Internal Server Error
            }
        }
    }
}
